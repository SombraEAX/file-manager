<template>
  <div class="dropdown-main" :data-editable="editable" ref="root">
    <div class="dropdown-button" @click.stop="toggle" @keydown="handleKeydown" tabindex="0">
      <input ref="input" v-if="editable" class="textbox" :value="inputText" @input="onInput" @focus="onFocus" @keydown.stop="handleKeydown">
      <div v-else class="text">{{ displayText }}</div>
      <div class="down-icon">▼</div>
    </div>
    <div class="items" v-if="isOpen">
      <div
        class="item"
        :class="{ selected: !multipleSelect && index === selectedIndex, highlighted: index === highlightedIndex }"
        v-for="(option, index) in options"
        :key="index"
        @click.stop="select(option, index)"
        @mouseenter="highlightedIndex = index"
      >
        <app-checkbox v-if="multipleSelect" :model-value="isSelected(option)" />
        <div class="label">{{ optLabel(option) }}</div>
      </div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json';
  import AppCheckbox from './AppCheckbox.vue';
  export default {
    components: { AppCheckbox },
    props: {
      options: Array,
      modelValue: [String, Array],
      editable: Boolean,
      multipleSelect: Boolean
    },
    data(){
      return {
        isOpen: false,
        theme,
        inputText: '',
        selectedIndex: -1,
        highlightedIndex: -1
      }
    },
    beforeUnmount(){
      document.removeEventListener('click', this.clickOutside, true);
    },
    created(){
      this.syncInput();
      this.syncText();
    },
    watch: {
      modelValue(newVal, oldVal){
        if(newVal !== oldVal){ this.syncInput(); this.syncText(); }
      },
      options: { handler(){ this.syncInput(); this.syncText(); }, deep: true }
    },
    computed:{
      displayText(){
        if(this.multipleSelect){
          let selected = this.modelValue || [];
          return selected.length ? selected.join(', ') : 'Select...';
        }
        return this.modelValue || 'Select...';
      }
    },
    methods:{
      optValue(option){
        return option && option.value !== undefined ? option.value : option;
      },
      optLabel(option){
        return option && option.label !== undefined ? option.label : option;
      },
      syncInput(){
        let idx = this.options.findIndex(o => this.optValue(o) === this.modelValue);
        this.selectedIndex = idx;
      },
      syncText(){
        if(!this.editable) return;
        if(this.selectedIndex >= 0 && this.inputText !== this.modelValue){
          this.inputText = this.optLabel(this.options[this.selectedIndex]);
        }else{
          this.inputText = this.modelValue || '';
        }
      },
      toggle(){
        if(this.isOpen){
          this.close();
        }else{
          this.isOpen = true;
          this.highlightedIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
          if(this.editable && this.selectedIndex >= 0){
            this.inputText = '';
          }
          document.addEventListener('click', this.clickOutside, true);
          this.$nextTick(() => {
            this.scrollToHighlighted();
            if(this.editable) this.$refs.input?.select();
          });
        }
      },
      clickOutside(e){
        if(!this.$refs.root || !this.$refs.root.contains(e.target)){
          if(this.editable && this.selectedIndex >= 0 && this.inputText === ''){
            this.syncText();
          }
          this.close();
        }
      },
      close(){
        document.removeEventListener('click', this.clickOutside, true);
        this.isOpen = false;
        this.$nextTick(() => {
          this.$refs.input?.setSelectionRange(0, 0);
          this.$refs.input?.blur();
        });
      },
      onFocus(){
        if(this.editable && this.selectedIndex >= 0){
          this.inputText = '';
        }
      },
      onInput(e){
        this.inputText = e.target.value;
        this.selectedIndex = -1;
        this.highlightedIndex = -1;
        this.$emit('update:modelValue', e.target.value);
      },
      handleKeydown(e){
        switch(e.key){
          case 'ArrowDown':
            e.preventDefault();
            if(!this.isOpen){
              this.toggle();
              return;
            }
            this.highlightedIndex = this.highlightedIndex < this.options.length - 1 ? this.highlightedIndex + 1 : 0;
            this.$nextTick(() => this.scrollToHighlighted());
            break;
          case 'ArrowUp':
            e.preventDefault();
            if(!this.isOpen) return;
            this.highlightedIndex = this.highlightedIndex > 0 ? this.highlightedIndex - 1 : this.options.length - 1;
            this.$nextTick(() => this.scrollToHighlighted());
            break;
          case 'Enter':
            e.preventDefault();
            if(!this.isOpen){
              this.toggle();
              return;
            }
            if(this.highlightedIndex >= 0){
              this.select(this.options[this.highlightedIndex], this.highlightedIndex);
            }else{
              this.close();
            }
            break;
          case 'Escape':
            e.preventDefault();
            this.close();
            break;
        }
      },
      scrollToHighlighted(){
        let items = this.$refs.root.querySelector('.items');
        if(!items) return;
        let el = items.querySelector('.highlighted') || items.querySelector('.selected');
        if(el) el.scrollIntoView({ block: 'nearest' });
      },
      select(option, index){
        let val = this.optValue(option);
        if(this.multipleSelect){
          let selected = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
          let idx = selected.indexOf(val);
          if(idx === -1){
            selected.push(val);
          }else{
            selected.splice(idx, 1);
          }
          this.$emit('update:modelValue', selected);
        }else{
          this.selectedIndex = index;
          if(this.editable){
            this.inputText = this.optLabel(option);
          }
          this.$emit('update:modelValue', val);
          this.close();
        }
      },
      isSelected(option){
        let val = this.optValue(option);
        return this.multipleSelect && Array.isArray(this.modelValue) && this.modelValue.includes(val);
      }
    }
  }
</script>
<style scoped>
  .dropdown-button{
    border:1px solid v-bind('theme.dropDown.borderColor');
    box-sizing:border-box;
    background:v-bind('theme.dropDown.background');
    color:v-bind('theme.dropDown.textColor');
    width:100%;
    height:20px; 
    display:flex;
    flex-direction:row;
    font-size:14px;
    outline:none
  }
  .text{
    margin:auto;
    flex:1;
    margin-left:2px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    min-width:0
  }
  .down-icon{
    margin:auto;
    margin-right:2px;
    font-size:12px;
    cursor:pointer;
    flex-shrink:0
  }
  .dropdown-main{
    width:100%;
    height:20px;
    position:relative;
  }
  .items{
    border:1px solid v-bind('theme.dropDown.borderColor');
    box-sizing:border-box;
    background:v-bind('theme.dropDown.background');
    color:v-bind('theme.dropDown.textColor');
  	position:absolute;
  	z-index:2000;
  	width:100%;
  	border-top:0px
  }
  .item{
    box-sizing:border-box;
    padding-left:2px;
    font-size:14px;
    height:20px;
    line-height:20px;
    cursor:pointer;
    display:flex;
    flex-direction:row;
  }
  .item>*{
    margin:auto
  }
  .item:hover{
    background:v-bind('theme.dropDown.itemHoverBackground')
  }
  .item.selected{
    background:v-bind('theme.dropDown.itemSelectedBackground');
    color:v-bind('theme.dropDown.itemSelectedTextColor');
    font-weight:bold;
  }
  .item.highlighted{
    background:v-bind('theme.dropDown.itemHoverBackground')
  }
  .label{
    flex:1;
    margin-left:2px
  }

  .dropdown-main[data-editable="false"] .dropdown-button{
    cursor:pointer
  }
  .textbox{
  	width:100%;
  	border:0px;
  	outline:none;
  	font-size:inherit;
  	font-family:inherit
  }
</style>