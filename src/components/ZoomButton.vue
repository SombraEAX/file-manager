<template>
  <div class="zoom-wrapper">
    <button
      class="zoom-button"
      :class="{ active: open }"
      title="Zoom"
      @click.stop="open = !open"
    ></button>
    <div class="popup" v-if="open" ref="popup">
      <div class="arrow"></div>
      <div class="popup-inner">
        <input
          type="range"
          class="zoom-slider"
          min="40"
          max="128"
          :value="scale"
          @input="onScale"
        />
        <span class="zoom-value">{{ label }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import { theme } from '../stores/theme'

  export default defineComponent({
    name: 'ZoomButton',
    emits: ['scaling'],
    props: {
      scale: Number
    },
    data(){
      return {
        theme,
        open: false
      }
    },
    computed: {
      label(){
        return Math.round(this.scale || 120) + 'px'
      }
    },
    methods: {
      onScale(ev: Event){
        this.$emit('scaling', Number((ev.target as HTMLInputElement).value))
      },
      closePopup(){
        this.open = false
      },
      onClickOutside(e: MouseEvent){
        if(this.$el && !this.$el.contains(e.target as Node)) this.open = false
      }
    },
    mounted(){
      document.addEventListener('click', this.onClickOutside)
    },
    beforeUnmount(){
      document.removeEventListener('click', this.onClickOutside)
    }
  })
</script>
<style scoped>
  .zoom-wrapper{
    position:relative;
    margin:0 2px;
  }
  .zoom-button{
    width:30px;
    height:30px;
    border:0px;
    outline:0;
    background-color:transparent;
    color:v-bind('theme.topPanelIconColor');
    cursor:pointer;
  }
  .zoom-button::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f00e";
    font-size:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%;
  }
  .zoom-button:hover,
  .zoom-button.active{
    color:v-bind('theme.topPanelIconHoverColor');
  }
  .popup{
    position:absolute;
    top:100%;
    right:0;
    z-index:9999;
    width:200px;
  }
  .arrow{
    position:absolute;
    top:-5px;
    right:8px;
    width:14px;
    height:6px;
  }
  .arrow::before,
  .arrow::after{
    content:'';
    position:absolute;
  }
  .arrow::before{
    top:0;
    left:0;
    width:100%;
    height:100%;
    background:v-bind('theme.dropDown.borderColor');
    clip-path:polygon(50% 0%, 0% 100%, 100% 100%);
  }
  .arrow::after{
    top:1px;
    left:1px;
    width:12px;
    height:5px;
    background:v-bind('theme.dropDown.background');
    clip-path:polygon(50% 0%, 0% 100%, 100% 100%);
  }
  .popup-inner{
    background:v-bind('theme.dropDown.background');
    border:1px solid v-bind('theme.dropDown.borderColor');
    border-radius:6px;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    display:flex;
    flex-direction:row;
    align-items:center;
    gap:8px;
    padding:10px 12px;
  }
  .zoom-slider{
    flex:1;
    min-width:0;
    accent-color:v-bind('theme.topPanelIconColor');
  }
  .zoom-value{
    font-family:v-bind('theme.font');
    font-size:12px;
    color:v-bind('theme.fontColor');
    white-space:nowrap;
    flex-shrink:0;
    min-width:36px;
    text-align:right;
  }
</style>
