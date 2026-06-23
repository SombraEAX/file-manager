<template>
  <div class="global-wrapper">
    <div 
      class="top-panel-container"
      :class="{ autohide: autohideTopPanel, 'panel-visible': topPanelVisible }"
    >
      <div class="top-panel-trigger" v-if="autohideTopPanel"
        @mouseenter="showTopPanel"
      ></div>
      <div class="top-panel-inner"
        @mouseenter="showTopPanel"
      >
        <menu-bar
          :view             = "view"
          :sortColumn       = "sortColumn"
          :sortOrder        = "sortOrder"
          :groupBy          = "groupBy"
          :isDev            = "isDev"
          :autohideLeftPanel = "autohideLeftPanel"
          :autohideTopPanel  = "autohideTopPanel"
          :showHidden        = "showHidden"
          @changeView       = "ev => view = ev"
          @changeSortColumn = "ev => sortColumn = ev"
          @changeSortOrder  = "ev => sortOrder = ev"
          @changeGroup      = "ev => groupBy = ev"
          @toggleAutohideLeftPanel = "autohideLeftPanel = !autohideLeftPanel"
          @toggleAutohideTopPanel  = "autohideTopPanel = !autohideTopPanel"
          @toggleShowHidden = "showHidden = !showHidden"
        />
        <tab-bar
          :tabs        = "tabs"
          :active-index = "activeTabIndex"
          @select      = "switchTab"
          @close       = "closeTab"
        />
        <top-panel
          ref="topPanel"
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
          @togglePreviewPanel = "rightPanelVisible = !rightPanelVisible"
          :previewPanelVisible="rightPanelVisible"
        />
      </div>
    </div>
    <div class="main" @mouseenter="scheduleHideTopPanel">
      <div 
        class="left-panel-container"
        :class="{ autohide: autohideLeftPanel, 'panel-visible': leftPanelVisible }"
      >
        <div class="left-panel-trigger" v-if="autohideLeftPanel"
          @mouseenter="showLeftPanel"
          @mouseleave="scheduleHideLeftPanel"
        ></div>
        <directory-tree
          class       = "tree" 
          :selected   = "currentDir"
          :width      = "leftPanelWidth"
          :items      = "isSearchMode && searchResults ? searchResults.length : entries.length"
          :files      = "isSearchMode && searchResults ? searchFiles : files"
          :dirsCount  = "isSearchMode && searchResults ? searchDirs : folders"
          @resize     = "w => leftPanelWidth = w"
          @select     = "jump"
          @mouseenter = "showLeftPanel"
          @mouseleave = "scheduleHideLeftPanel"
        />
      </div>
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
        v-show="rightPanelVisible"
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
  import EntryIcon from './components/EntryIcon.vue'
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
      TabBar,
      EntryIcon
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
        iconSize: 120,
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
        _restoreScrollPending: false,
        autohideLeftPanel: localStorage.getItem('autohideLeftPanel') === 'true',
        leftPanelVisible: false,
        _leftPanelTimer: null,
        autohideTopPanel: localStorage.getItem('autohideTopPanel') === 'true',
        topPanelVisible: false,
        _topPanelTimer: null,
        rightPanelVisible: localStorage.getItem('rightPanelVisible') !== 'false',
        showHidden: localStorage.getItem('showHidden') === 'true'
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

      showLeftPanel(){
        if(this._leftPanelTimer){
          clearTimeout(this._leftPanelTimer)
          this._leftPanelTimer = null
        }
        this.leftPanelVisible = true
      },
      scheduleHideLeftPanel(){
        if(this._leftPanelTimer) clearTimeout(this._leftPanelTimer)
        this._leftPanelTimer = setTimeout(() => {
          this.leftPanelVisible = false
        }, 300)
      },
      showTopPanel(){
        if(this._topPanelTimer){
          clearTimeout(this._topPanelTimer)
          this._topPanelTimer = null
        }
        this.topPanelVisible = true
      },
      scheduleHideTopPanel(){
        if(this._topPanelTimer) clearTimeout(this._topPanelTimer)
        this._topPanelTimer = setTimeout(() => {
          this.topPanelVisible = false
          if(this.$refs.topPanel) this.$refs.topPanel.closeDropdowns()
        }, 300)
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
      
      autohideLeftPanel(val){
        localStorage.setItem('autohideLeftPanel', val)
        if(val) this.leftPanelVisible = false
      },
      autohideTopPanel(val){
        localStorage.setItem('autohideTopPanel', val)
        if(val) this.topPanelVisible = false
      },
      rightPanelVisible(val){
        localStorage.setItem('rightPanelVisible', val)
      },
      showHidden(val){
        localStorage.setItem('showHidden', val)
        if(this._allEntries){
          let folders = 0, files = 0
          let filtered = val ? this._allEntries : this._allEntries.filter(e => e.name[0] !== '.')
          for(let entry of filtered){
            if(entry.type === 'directory') folders++
            if(entry.type === 'file')      files++
          }
          this.entries = filtered
          this.folders = folders
          this.files   = files
        }
      },

      async currentDir(){
        this.isSearchMode = false;
        this.searchResults = null;
        try {
          let folders = 0
          let files   = 0
          this._allEntries = await window.electron.readdir(this.currentDir)
          let filtered = this.showHidden ? this._allEntries : this._allEntries.filter(e => e.name[0] !== '.')
          
          for(let entry of filtered){
            if(entry.type === 'directory') folders++
            if(entry.type === 'file')      files++
          }

          this.entries = filtered
          
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
    flex-direction:column;
    position:relative
  }

  .main{
    display:flex;
    flex:1;
    flex-direction:row;
    align-items:stretch;
    position:relative
  }
  .tree{
    width:200px
  }
  .top-panel-container{
    flex-shrink:0
  }
  .top-panel-container.autohide{
    height:0;
    overflow:visible;
    position:relative;
    z-index:350
  }
  .top-panel-trigger{
    position:absolute;
    top:0;
    left:0;
    right:0;
    height:4px;
    cursor:default
  }
  .top-panel-container.autohide .top-panel-inner{
    position:absolute;
    top:0;
    left:0;
    right:0;
    z-index:1;
    background:#fff;
    transform:translateY(-100%);
    transition:transform .15s ease;
    padding-bottom:6px
  }
  .top-panel-container.autohide.panel-visible .top-panel-inner{
    transform:translateY(0);
    box-shadow:0 2px 8px rgba(0,0,0,.3)
  }
  .left-panel-container{
    display:flex;
    position:relative
  }
  .left-panel-container.autohide{
    position:absolute;
    left:0;
    top:0;
    bottom:0;
    width:0;
    overflow:visible;
    z-index:200
  }
  .left-panel-trigger{
    position:absolute;
    left:0;
    top:0;
    bottom:0;
    width:6px;
    z-index:1;
    cursor:default
  }
  .left-panel-container.autohide .tree{
    position:absolute !important;
    left:0 !important;
    top:0 !important;
    bottom:0 !important;
    z-index:101 !important;
    transform:translateX(-100%);
    transition:transform .15s ease;
    background:#fff
  }
  .left-panel-container.autohide.panel-visible .tree{
    transform:translateX(0);
    box-shadow:2px 0 8px rgba(0,0,0,.3)
  }
  .left-panel-container.autohide .tree .line{
    background-color:transparent !important;
    border-color:transparent !important
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
