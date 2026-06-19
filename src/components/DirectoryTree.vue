<template>
  <side-bar
    @resize="(ev) => $emit('resize',ev)"
    :width="width"
    minWidth="150"
    position="left"
  >
    <div class="tree-wrap">
      <div class="outer scrollbox">
        <div class="inner">
          <directory-list
            :dirs="dirs" 
            :selected="selected" 
            @select="(ev) => $emit('select',ev)"
          />
        </div>
      </div>
      <div class="counts">
        <span class="count-icon icon-item"></span> {{ items }}
        <span class="count-icon icon-file"></span> {{ files }}
        <span class="count-icon icon-folder"></span> {{ dirsCount }}
      </div>
    </div>
  </side-bar>
</template>
<script>
  import theme from '../../theme.json'
  import DirectoryList from './DirectoryList.vue'
  import SideBar from './SideBar.vue'

  export default {
    emits: ['select', 'resize'],
    props: {
      width: Number,
      dirs: {
        type: Array,
        default: () => []
      },
      selected: String,
      items: Number,
      files: Number,
      dirsCount: Number
    },
    methods:{
    },
    components: { DirectoryList, SideBar },
    data(){			
      return {
        theme
      }
    }
  }
</script>
<style scoped>
  .inner{
    position:absolute;
    left:0px;
    top:0px;
    width:100%;
    height:100%;
    padding:10px;
    box-sizing:border-box;
  }
  .outer{
    flex:1;
    min-height:0;
    display: block;
    position:relative;
  }
  .tree-wrap{
    height:100%;
    display:flex;
    flex-direction:column;
  }
  .counts{
    padding:4px 10px;
    font-size:12px;
    line-height:14px;
    white-space:nowrap;
    font-family:sans-serif;
    background:transparent;
    color:v-bind('theme.sidebarTextColor');
    flex-shrink:0;
    display:flex;
    align-items:center;
    gap:4px;
  }

  .count-icon{
    display:inline-block;
    width:14px;
    height:14px;
    background-size:contain;
    background-repeat:no-repeat;
    background-position:center;
    margin-left:6px;
  }
  .icon-item::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f009";
    font-size:12px;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%
  }
  .icon-file::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f15b";
    font-size:12px;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%
  }
  .icon-folder::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f07b";
    font-size:12px;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%
  }
</style>
