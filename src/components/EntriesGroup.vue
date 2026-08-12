<template>
  <div class="entries-group">
    <div class="titlebar" @click="$emit('toggle')" v-if="name">
      <div class="title">{{name}}</div>
      <div class="icon" :data-expand="!collapsed"></div>
    </div>
    <div v-if="!name || !collapsed" :style="gridStyle">
      <slot></slot>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import { theme } from '../stores/theme'

  export default defineComponent({
    name:'EntriesGroup',
    props: {
      name:String,
      view:String,
      iconSize: Number,
      collapsed: Boolean
    },
    emits: ['toggle'],
    data(){
      return {
        theme
      }
    },
    computed: {
      gridStyle() {
        if (this.view === 'icons') {
          const minSize = Math.max(this.iconSize || 120, 120)
          return {
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${minSize}px, 1fr))`,
            gap: '20px'
          }
        }
        if (this.view === 'list') {
          return {
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(150px, 1fr))`,
            gap: '5px'
          }
        }
        return null
      }
    },
    methods: {
    }
  })
</script>
<style scoped>
  .titlebar{
    margin:5px;
    padding:5px;
    border-radius:5px;
    cursor:pointer;
    display:flex;
    flex-direction:row;
    align-items:center;
    color:v-bind('theme.groupTitle.fontColor');
  }
  .titlebar:hover{
    color:v-bind('theme.groupTitle.hoverFontColor');
    background-color:v-bind('theme.groupTitle.hoverBackgroundColor');
  }
  .title{
    flex:1;
    font-size:20px;
    font-family:v-bind('theme.font')
  }
  .icon{
    width:20px;
    height:20px;
    display:inline-flex;
    align-items:center;
    justify-content:center
  }
  .icon::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    font-size:16px
  }
  .icon[data-expand="true"]::before{
    content:"\f146"
  }
  .icon[data-expand="false"]::before{
    content:"\f0fe"
  }
</style>
