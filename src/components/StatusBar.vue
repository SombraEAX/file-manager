<template>
  <div class="status-bar">
    <div class="text">{{ items }} items</div>
    <div class="text">{{ files }} files</div>
    <div class="text">{{ dirs }} folders</div>
    <div class="text" v-if="selected">{{ selected }} items selected {{ prettyBytes(size) }}</div>
    <div style="flex: 1"></div>
    <input
      type="range"
      id="myRange"
      name="volume"
      min="64"
      max="500"
      v-model.number="localScale"  
      v-if="view === 'icons'"
      @input="emitScale"  
    >
    <button
      class="icon icon-list"
      :class="{ active: view === 'list' }"
      @click="$emit('changeView', 'list')"
    ></button>
    <button
      class="icon icon-icons"
      :class="{ active: view === 'icons' }"
      @click="$emit('changeView', 'icons')"
    ></button>
    <button
      class="icon icon-table"
      :class="{ active: view === 'table' }"
      @click="$emit('changeView', 'table')"
    ></button>
  </div>
</template>

<script>
  import prettyBytes from 'pretty-bytes'
  import theme from '../../theme'

  export default {
    emits: ['changeView', 'scaling'],
    name: 'StatusBar',
    props: {
      scale: Number,
      items: Number,
      dirs: Number,
      files: Number,
      selected: Number,
      size: Number,
      view: String,
    },
    data() {
      return {
        theme,
        localScale: this.scale, 
      };
    },
    watch: {
      scale(newScale) {
        this.localScale = newScale;
      },
    },
    methods: {
      prettyBytes,
      emitScale() {
        this.$emit('scaling', this.localScale); 
      },
    },
  };
</script>
<style scoped>
  .status-bar{
    display:flex;
    flex-direction:row;
    font-family:v-bind('theme.font');
    font-size:14px;
    line-height:14px;
  }
  .text{
    padding:5px;    
    margin-right:8px
  }
  .icon{
    width:24px;
    height:24px;
    background-position:center;
    background-size:16px;
    background-repeat:no-repeat;
    border:0px;
    background-color:transparent
  }
  .icon-list{
    background-image:url("../assets/list.png")
  }
  .icon-table{
    background-image:url("../assets/table.png")
  }
  .icon-icons{
    background-image:url("../assets/icons.png")
  }
  .icon:not(.active):hover{
    filter: hue-rotate(90deg);    
  }
  .icon.active{
    filter: hue-rotate(90deg);  	
  }
  .icon:not(.active){
    cursor:pointer;
  }
</style>
