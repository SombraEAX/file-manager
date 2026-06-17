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
    <tab-bar
      :tabs        = "tabs"
      :active-index = "activeTabIndex"
      @select      = "switchTab"
      @close       = "closeTab"
    />
    <top-panel
      :address            = "currentDir"
      :history            = "tabs[activeTabIndex]?.history || []"
      :historyIndex       = "tabs[activeTabIndex]?.historyIndex ?? -1"
      :search-version     = "searchVersion"
      @back               = "ev => tabs[activeTabIndex].historyIndex--"
      @forward            = "ev => tabs[activeTabIndex].historyIndex++"
      @up                 = "up"
      @jump               = "jump"
      @changeHistoryIndex = "ev => tabs[activeTabIndex].historyIndex = ev"
      @search             = "onSearchResults"
      :view               = "view"
      @changeView         = "ev => view = ev"
    />
    <div class="main">
      <directory-tree
        class       = "tree" 
        :dirs       = "dirs" 
        :selected   = "currentDir"
        :width      = "leftPanelWidth"
        :items      = "isSearchMode && searchResults ? searchResults.length : entries.length"
        :files      = "isSearchMode && searchResults ? searchFiles : files"
        :dirsCount  = "isSearchMode && searchResults ? searchDirs : folders"
        @resize     = "w => leftPanelWidth = w"
        @select     = "jump"
      />
      <work-zone
        ref="workzone"
        :iconSize   = "iconSize"
        :sortColumn = "sortColumn"
        :sortOrder  = "sortOrder"
        :groups     = "groups"
        :view       = "view"
        :address    = "currentDir"
        @changeSort = "changeSort"
        @openDir    = "openDir"
        @select     = "ev => previewPath = ev"
        @contextMenu = "onFolderContextMenu"
      />
      <preview-panel
        :path   = "previewPath"
        :width  = "rightPanelWidth"
        :view   = "view"
        :scale  = "iconSize"
        @resize = "w => rightPanelWidth = w"
        @scaling = "ev => iconSize = ev"
      />
    </div>
    <transition name="toast-fade">
      <div class="toast" v-if="toastVisible">{{ toastText }}</div>
    </transition>
  </div>
</template>

<script>
  import DirectoryTree from './components/DirectoryTree.vue'
  import theme from '../theme.json'
  import TopPanel from './components/TopPanel.vue'
  import WorkZone from './components/WorkZone.vue'
  import PreviewPanel from './components/PreviewPanel.vue'
  import MenuBar from './components/MenuBar.vue'
  import TabBar from './components/TabBar.vue'
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
      DirectoryTree,
      TopPanel,
      PreviewPanel,
      TabBar
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
        tabs: [],
        activeTabIndex: -1,
        tabIdCounter: 0,
        iconSize: 200,
        view: 'table',
        entries: [],
        files: 0,
        folders: 0,
        sortColumn: 'name',
        sortOrder: 'asc',
        groupBy: null,
        isDev: ~location.href.indexOf('localhost'),
        toastText: '',
        toastVisible: false,
        toastTimer: null,
        searchResults: null,
        searchQuery: '',
        isSearchMode: false,
        searchVersion: 0,
        _restoreScrollPending: false
      }
    },
    
    methods:{
    
      openDir(dirname){
        if(this.isSearchMode && dirname.startsWith('/')){
          this.isSearchMode = false;
          this.searchResults = null;
          this.jump(dirname);
        }else{
          this.jump(window.electron.join(this.currentDir, dirname));
        }
      },

      onSearchResults({ query, results }){
        if(results === null){
          this.isSearchMode = false;
          this.searchResults = null;
          this.searchQuery = '';
          return;
        }
        this.searchQuery = query;
        this.searchResults = results;
        this.isSearchMode = true;
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

      switchTab(index){
        if(index < 0 || index >= this.tabs.length || index === this.activeTabIndex) return;
        let el = this.$refs.workzone?.$el.querySelector('.inner');
        if(el) this.tabs[this.activeTabIndex].scrollTop = el.scrollTop;
        this.activeTabIndex = index;
        this._restoreScrollPending = true;
        this.searchVersion++;
      },

      closeTab(index){
        if(this.tabs.length <= 1) return;
        let wasActive = index === this.activeTabIndex;
        this.tabs.splice(index, 1);
        if(index < this.activeTabIndex){
          this.activeTabIndex--;
        }else if(index === this.activeTabIndex && this.activeTabIndex >= this.tabs.length){
          this.activeTabIndex = this.tabs.length - 1;
        }
        if(wasActive) this._restoreScrollPending = true;
        this.searchVersion++;
      },

      openInNewTab(pathname){
        if(!pathname.startsWith('/'))
          pathname = window.electron.join(this.currentDir, pathname);
        try {
          if(!window.electron.isDir(pathname)) throw new Error();
        } catch(e) {
          this.showToast('Folder not found');
          return;
        }
        this.tabs.push({ id: ++this.tabIdCounter, history: [pathname], historyIndex: 0, scrollTop: 0 });
        this.activeTabIndex = this.tabs.length - 1;
        this.searchVersion++;
      },

      jump(pathname){
        try {
          if(!window.electron.isDir(pathname)) throw new Error();
        } catch(e) {
          this.showToast('Folder not found');
          return;
        }
        this.isSearchMode = false;
        this.searchResults = null;
        this.searchVersion++;
        let tab = this.tabs[this.activeTabIndex];
        tab.history[++tab.historyIndex] = pathname
        if(tab.history.length > tab.historyIndex + 1){
          tab.history.splice(tab.historyIndex + 1)
        }
      },
      
      up(){
        this.isSearchMode = false;
        this.searchResults = null;
        this.jump(this.currentDir.replace(/\/[^/]+\/?$/,'') || '/')
      },

      onFolderContextMenu({ path, x, y }){
        window.electron.ipcRenderer.send('show-menu', {
          items: [
            { label: 'Open' },
            { label: 'Open in new tab' }
          ],
          x, y
        });
        window.electron.ipcRenderer.once('show-menu-reply', (_, index) => {
          if(index === 0){
            this.openDir(path);
          }else if(index === 1){
            this.openInNewTab(path);
          }
        });
      },

      showToast(text){
        if(this.toastTimer) clearTimeout(this.toastTimer);
        this.toastText = text;
        this.toastVisible = true;
        this.toastTimer = setTimeout(() => {
          this.toastVisible = false;
          this.toastTimer = null;
        }, 2500);
      },
      getGroup(entry){
        switch(this.groupBy){
          case 'name': return entry.name[Number(entry.name[0] === '.')].toUpperCase()
          case 'modified': return new Date(entry.modified).toISOString().split('T')[0]
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
      },
      restoreScroll(){
        if(!this._restoreScrollPending) return;
        this._restoreScrollPending = false;
        let el = this.$refs.workzone?.$el.querySelector('.inner');
        let tab = this.tabs[this.activeTabIndex];
        if(el && tab && tab.scrollTop){
          el.scrollTop = tab.scrollTop;
        }
      }
    },
    
    mounted(){
      this.tabs.push({ id: ++this.tabIdCounter, history: [], historyIndex: -1, scrollTop: 0 });
      this.activeTabIndex = 0;
      this.jump(homedir)
    },
    
    computed:{
      groups(){
        let source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries;

        let groups = []
        let prop = {
          name: 'name',
          size: 'size',
          type: 'filetype',
          modified: 'mtimeMs'
        }[this.sortColumn]

        for(let entry of source){
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
        let tab = this.tabs[this.activeTabIndex];
        return tab ? tab.history[tab.historyIndex] : undefined;
      },

      searchFiles(){
        return this.searchResults ? this.searchResults.filter(e => e.type === 'file').length : 0;
      },

      searchDirs(){
        return this.searchResults ? this.searchResults.filter(e => e.type === 'directory').length : 0;
      }
      
    },
    
    watch:{
      
      async currentDir(){
        this.isSearchMode = false;
        this.searchResults = null;
        try {
          let folders = 0
          let files   = 0
          this.entries = await window.electron.readdir(this.currentDir)
          
          for(let entry of this.entries){
            if(entry.type === 'directory') folders++
            if(entry.type === 'file')      files++
          }
          
          this.folders = folders
          this.files   = files
          this.$nextTick(() => this.restoreScroll());
        } catch(e) {
          this.showToast('Folder not found');
        }
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
  .toast{
    position:fixed;
    top:55px;
    left:50%;
    transform:translateX(-50%);
    background:#000;
    color:#fff;
    padding:5px 16px;
    border-radius:6px;
    font-size:13px;
    font-family:v-bind('theme.font');
    z-index:9999;
    white-space:nowrap;
    pointer-events:none;
    line-height:1;
  }
  .toast-fade-enter-active, .toast-fade-leave-active{
    transition:opacity 0.5s;
  }
  .toast-fade-enter, .toast-fade-leave-to{
    opacity:0;
  }
</style>
