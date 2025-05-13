<template>
  <div class="global-wrapper">
    <menu-bar
      :view             = "view"
      :sortColumn       = "sortColumn"
      :sortOrder        = "sortOrder"
      :groupBy          = "groupBy"
      :isDev            = "isDev"
      @changeView       = "ev => view = ev"
      @changeSortColumn = "ev => sortColumn = ev"
      @changeSortOrder  = "ev => sortOrder = ev"
      @changeGroup      = "ev => groupBy = ev"
    />
    <top-panel
      :address            = "currentDir"
      :history            = "history"
      :historyIndex       = "historyIndex"
      @back               = "ev => historyIndex--"
      @forward            = "ev => historyIndex++"
      @up                 = "up"
      @jump               = "jump"
      @changeHistoryIndex = "ev => historyIndex = ev"
    />
    <div class="main">
      <directory-tree
        class     = "tree" 
        :dirs     = "dirs" 
        :selected = "currentDir"
        :width    = "leftPanelWidth"
        @resize   = "w => leftPanelWidth = w"
        @select   = "jump"
      />
      <work-zone
        :iconSize   = "iconSize"
        :sortColumn = "sortColumn"
        :sortOrder  = "sortOrder"
        :groups     = "groups"
        :view       = "view"
        :address    = "currentDir"
        @changeSort = "changeSort"
        @openDir    = "openDir"
        @select     = "ev => previewPath = ev"
      />
      <preview-panel
        :path   = "previewPath"
        :width  = "rightPanelWidth"
        @resize = "w => rightPanelWidth = w"
      />
    </div>
    <status-bar
      :items      = "entries.length" 
      :dirs       = "folders" 
      :files      = "files" 
      :view       = "view"
      :scale      = "iconSize"
      @scaling    = "ev => iconSize = ev"
      @changeView = "ev => view = ev"
    />
  </div>
</template>

<script>
  import StatusBar from './components/StatusBar.vue'
  import DirectoryTree from './components/DirectoryTree.vue'
  import theme from '../theme.json'
  import TopPanel from './components/TopPanel.vue'
  import WorkZone from './components/WorkZone.vue'
  import PreviewPanel from './components/PreviewPanel.vue'
  import MenuBar from './components/MenuBar.vue'
  import prettyBytes from 'pretty-bytes'

  const username = window.electron.getUserName()
  const homedir  = `/home/${username}`
  const KB = 1024
  const MB = 1024 * 1024
  const GB = 1024 * 1024 * 1024

  export default {
    name: 'App',
    
    components: {
      MenuBar,
      WorkZone,
      StatusBar,
      DirectoryTree,
      TopPanel,
      PreviewPanel
    },
    
    data(){      
      return {
        previewPath: null,
        leftPanelWidth: 200,
        rightPanelWidth: 300,
        theme,
        dirs: [
          { name: username, pathname: homedir, caption:username },
          { name: '/', pathname: '/', caption: 'System root' }
        ],
        history: [],
        historyIndex: -1,
        iconSize: 200,
        view: 'table',
        entries: [],
        files: 0,
        folders: 0,
        sortColumn: 'name',
        sortOrder: 'asc',
        groupBy: null,
        isDev: ~location.href.indexOf('localhost')
      }
    },
    
    methods:{
    
      openDir(dirname){
        this.jump(window.electron.join(this.currentDir, dirname))
      },

      changeSort(col,sort){
        this.sortColumn = col
        this.sortOrder  = sort
      },      

      sortByProperty(array, property, order){
        return array.sort((a, b) => {
          const valA = a[property]
          const valB = b[property]

          if (typeof valA === 'number' && typeof valB === 'number') 
            return order === 'asc' ? valA - valB : valB - valA

          if (typeof valA === 'string' && typeof valB === 'string') 
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)

          return 0
        })
      },

      jump(pathname){
        this.history[++this.historyIndex] = pathname
        if(this.history.length > this.historyIndex + 1){
          this.history.splice(this.historyIndex + 1)
        }
      },
      
      up(){
        this.jump(this.currentDir.replace(/\/[^/]+\/?$/,'') || '/')
      },

      getGroup(entry){
        switch(this.groupBy){
          case 'name': return entry.name[Number(entry.name[0] === '.')].toUpperCase()
          case 'modified': return entry.mtime.toISOString().split('T')[0]
          case 'size': {
            let {size} = entry
            if(size < 10 * KB)  return '< 10 KB'
            if(size < 100 * KB) return '10 — 100 KB'
            if(size < MB)       return '100 KB — 1 MB'
            if(size < 10 * MB)  return '1 — 10 MB'
            if(size < 100 * MB) return '10 — 100 MB'
            if(size < GB)       return '100 MB — 1 GB'
            return Math.floor(size/GB) + ' GB'
          }
          case 'type': return entry.filetype
          default: null
        }
      }
    },
    
    mounted(){
      this.jump(homedir)
    },
    
    computed:{
      groups(){
        let groups = []
        let prop = {
          name: 'name',
          size: 'size',
          type: 'filetype',
          modified: 'mtimeMs'
        }[this.sortColumn]

        for(let entry of this.entries){
          let groupName = this.getGroup(entry)
          let group = groups.find(g => g.name === groupName)
          if(!group) groups.push(group = {name:groupName, entries:[]})
          group.entries.push(entry)
        }
        
        for(let group of groups)
          group.entries = this.sortByProperty(
           group.entries,
           prop,
           this.sortOrder
         )
        return groups
      },
          
      currentDir(){
        return this.history[this.historyIndex]
      }
      
    },
    
    watch:{
      
      async currentDir(){
        let folders = 0
        let files   = 0
        this.entries = await window.electron.readdir(this.currentDir)
          
        for(let entry of this.entries){
          if(entry.type === 'directory') folders++
          if(entry.type === 'file')      files++
        }
        
        this.folders = folders
        this.files   = files
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
    user-select: none;
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
    flex-direction:row;
    align-items:stretch
  }
  .tree{
    width:200px
  }
  ::-webkit-scrollbar {
    width: 12px; 
    height: 12px; 
  }

  ::-webkit-scrollbar-track {
    background-color: rgba(0, 0, 0, 0);
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(150, 150, 150, 0.6);
    border: 2px solid rgba(0, 0, 0, 0);
    background-clip: padding-box;
    border-radius: 6px; 
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(100, 100, 100, 0.8);
  }

  ::-webkit-scrollbar-corner {
    background-color: rgba(0, 0, 0, 0);
  }

  .scrollbox{
    overflow:hidden
  }
  .scrollbox:hover{
    overflow:auto
  }
</style>
