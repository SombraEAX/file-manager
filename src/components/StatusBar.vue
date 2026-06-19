<template>
  <div class="status-bar">
    <div class="text"><span class="icon-item"></span> {{ items }}</div>
    <div class="text"><span class="icon-file"></span> {{ files }}</div>
    <div class="text"><span class="icon-folder"></span> {{ dirs }}</div>
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
    border:0px;
    background-color:transparent
  }
  .icon-list::before,
  .icon-icons::before,
  .icon-table::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    font-size:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%
  }
  .icon-list::before{ content:"" }
  .icon-icons::before{ content:"" }
  .icon-table::before{ content:"󰀻" }
  .icon-item,
  .icon-file,
  .icon-folder{
    display:inline-block;
    width:16px;
    height:16px;
    vertical-align:middle;
    margin-right:3px
  }
  .icon-item::before,
  .icon-file::before,
  .icon-folder::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    font-size:14px;
    display:flex;
    align-items:center;
    justify-content:center
  }
  .icon-item::before{ content:"\f009" }
  .icon-file::before{ content:"\f15b" }
  .icon-folder::before{ content:"\f07b" }
  .icon:not(.active):hover{
    color:v-bind('theme.topPanelIconHoverColor')
  }
  .icon.active{
    color:v-bind('theme.topPanelIconHoverColor')
  }
  .icon{
    color:v-bind('theme.topPanelIconColor')
  }
  .icon:not(.active){
    cursor:pointer;
  }
</style>
