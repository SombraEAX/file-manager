<template>
  <div class="global-wrapper">
    <div class="top-panel"></div>
    <div class="main">
      <directory-tree
        :dirs="dirs" 
        class="tree" 
        :selected="currentDir"
        @select="(ev) => currentDir = ev"
      />
      <div class="workzone"></div>
    </div>
    <status-bar :items="100" :dirs="60" :files="40"/>
  </div>
</template>

<script>
  import StatusBar from './components/StatusBar.vue'
  import DirectoryTree from './components/DirectoryTree.vue'
  import theme from '../theme.json'

  export default {
    name: 'App',
    components: {
      StatusBar,
      DirectoryTree
    },
    data(){
      let username = window.electron.getUserName()
      let homedir  = `/home/${username}`
      
      return {
        currentDir: homedir,
        theme,
        dirs: [
          { name: username, pathname: homedir, caption:username },
          { name: '/', pathname: '/', caption: 'System root' }
        ]
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

  .top-panel{
    height:50px;
    border-bottom:1px solid v-bind('theme.borderColor')
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
