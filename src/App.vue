<template>
  <div class="global-wrapper">
    <top-panel
      :address="currentDir"
      :history="history"
      :historyIndex="historyIndex"
      @back="back"
      @forward="forward"
      @up="up"
      @jump="jump"
      @changeHistoryIndex="changeHistoryIndex"
    />
    <div class="main">
      <directory-tree
        :dirs="dirs" 
        class="tree" 
        :selected="currentDir"
        @select="jump"
      />
      <div class="workzone"></div>
    </div>
    <status-bar
      :items="100" 
      :dirs="60" 
      :files="40" 
      :view="view"
      @changeView="ev => view = ev"
    />
  </div>
</template>

<script>
  import StatusBar from './components/StatusBar.vue'
  import DirectoryTree from './components/DirectoryTree.vue'
  import theme from '../theme.json'
  import TopPanel from './components/TopPanel.vue'

  const username = window.electron.getUserName()
  const homedir  = `/home/${username}`

  export default {
    name: 'App',
    components: {
      StatusBar,
      DirectoryTree,
      TopPanel
    },
    data(){      
      return {
        theme,
        dirs: [
          { name: username, pathname: homedir, caption:username },
          { name: '/', pathname: '/', caption: 'System root' }
        ],
        history: [],
        historyIndex: -1,
        view: 'table'
      }
    },
    methods:{
      jump(pathname){
        this.history[++this.historyIndex] = pathname
        if(this.history.length > this.historyIndex + 1){
          this.history.splice(this.historyIndex + 1)
        }
      },
      back(){
        this.historyIndex--
      },
      forward(){
      	this.historyIndex++
      },
      changeHistoryIndex(newIndex){
        this.historyIndex = newIndex
      },
      up(){
        this.jump(this.currentDir.replace(/\/[^/]+\/?$/,'') || '/')
      }
    },
    mounted(){
      this.jump(homedir)
    },
    computed:{
      currentDir(){
        return this.history[this.historyIndex]
      }
    }
  }
</script>

<style>
  html,body,#app{
    height:100%;
    max-height:100%;
    padding:0px;
    margin:0px;
  }
  
  body{
    font-family:v-bind('theme.font')
  }

  .global-wrapper{
    height:100%;
    max-height:100%;
    display:flex;
    flex-direction:column
  }

  .main{
    display:flex;
    flex:1;
    flex-direction:row
  }
  
  .tree{
    width:200px
  }
</style>
