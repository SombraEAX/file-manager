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
        :width="leftPanelWidth"
        @resize="w => leftPanelResize(w)"
      />
      <WorkZone
        :sortColumn="sortColumn"
        :sortOrder="sortOrder"
        :groups="groups"
        :view="view"
        :address="currentDir"
        @changeSort="changeSort"
        @openDir="openDir"
      />
    </div>
    <status-bar
      :items="entries.length" 
      :dirs="folders" 
      :files="files" 
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
  import WorkZone from './components/WorkZone.vue'
  import prettyBytes from 'pretty-bytes'

  const username = window.electron.getUserName()
  const homedir  = `/home/${username}`
  const { ipcRenderer } = window.electron
  const KB = 1024
  const MB = 1024 * 1024
  const GB = 1024 * 1024 * 1024

  export default {
    name: 'App',
    
    components: {
      WorkZone,
      StatusBar,
      DirectoryTree,
      TopPanel
    },
    
    data(){      
      return {
        leftPanelWidth: 200,
        theme,
        dirs: [
          { name: username, pathname: homedir, caption:username },
          { name: '/', pathname: '/', caption: 'System root' }
        ],
        history: [],
        historyIndex: -1,
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
      leftPanelResize(w){
        this.leftPanelWidth = w
      },
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

      menuItemClick(id){
        switch(id){
          case 'icons':
          case 'table':
          case 'list': {
            this.view = id
            break
          }
          case 'sort-by-name':
          case 'sort-by-type':
          case 'sort-by-modified':
          case 'sort-by-size': {
            this.sortColumn = id.split('-')[2]
            break
          }
          case 'asc':
          case 'desc': {
            this.sortOrder = id
            break
          }
          case 'group-by-name':
          case 'group-by-type':
          case 'group-by-modified':
          case 'group-by-size': {
            this.groupBy = id.split('-')[2]
            break
          }
          case 'no-group': {
            this.groupBy = null
            break
          }
        }
      },
      
      updateMenuBar(newValue){
        ipcRenderer.send(
          'update-menu-bar',
          JSON.parse(JSON.stringify(newValue))
        )
      },
      
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
      this.updateMenuBar(this.menuBar)
      ipcRenderer.on('menu-bar-click',(_,key) => this.menuItemClick(key))
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
    
      menuBar(){
        return [
          {
            label: 'View',
            submenu:[
              {
                type: 'radio', 
                label: 'Icons', 
                id: 'icons', 
                checked: this.view === 'icons' 
              },
              {
                type: 'radio', 
                label: 'List',  
                id: 'list',
                checked: this.view === 'list' 
              },
              {
                type: 'radio', 
                label: 'Table', 
                id: 'table',
                checked: this.view === 'table' 
              },
              { type: 'separator' },
              {
                label: 'Sort by',
                submenu:[
                  {
                    label:   'Name',
                    id:      'sort-by-name',
                    type:    'radio',
                    checked: this.sortColumn === 'name'
                  },
                  {
                    label:   'Modified',
                    id:      'sort-by-modified',
                    type:    'radio',
                    checked: this.sortColumn === 'modified'
                  },
                  {
                    label:   'Size',
                    id:      'sort-by-size',
                    type:    'radio',
                    checked: this.sortColumn === 'size'
                  },
                  {
                    label:   'Type',
                    id:      'sort-by-type',
                    type:    'radio',
                    checked: this.sortColumn === 'type'
                  },
                  { type: 'separator' },
                  {
                    label:   'Ascending order',
                    id:      'asc',
                    type:    'radio',
                    checked: this.sortOrder === 'asc'
                  },
                  {
                    label:   'Descending order',
                    id:      'desc',
                    type:    'radio',
                    checked: this.sortOrder === 'desc'
                  },                  
                ]
              },
              {
                label: 'Group by',
                submenu:[
                  {
                    label:   'Name',
                    id:      'group-by-name',
                    type:    'radio',
                    checked: this.groupBy === 'name'
                  },
                  {
                    label:   'Modified',
                    id:      'group-by-modified',
                    type:    'radio',
                    checked: this.groupBy === 'modified'
                  },
                  {
                    label:   'Size',
                    id:      'group-by-size',
                    type:    'radio',
                    checked: this.groupBy === 'size'
                  },
                  {
                    label:   'Type',
                    id:      'group-by-type',
                    type:    'radio',
                    checked: this.groupBy === 'type'
                  },
                  {
                    label:   'None',
                    id:      'no-group',
                    type:    'radio',
                    checked: this.groupBy === null
                  }
                ]                
              },
              { role: 'toggleDevTools', visible: this.isDev }              
            ]
          }
        ]
      },
      
      currentDir(){
        return this.history[this.historyIndex]
      }
      
    },
    
    watch:{
    
      menuBar:{
        deep:true,
        handler(newValue){
          this.updateMenuBar(newValue)
        }
      },
      
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
</style>
