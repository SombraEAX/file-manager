<template>
  <div class="global-wrapper" :class="{ 'custom-frame': customFrame }">
      <div class="top-panel-container">
        <div
          class="title-bar"
          v-if="titleBarVisible"
          :class="{ 'menu-open': menuState.open }"
          @dblclick="toggleWindowMaximize"
        >
          <window-controls />
        </div>
        <menu-bar
          v-if="customFrame"
          ref               = "menuBar"
          :class            = "{ hidden: !showMenuBar }"
          :view             = "view"
          :sortColumn       = "sortColumn"
          :sortOrder        = "sortOrder"
          :groupBy          = "groupBy"
          :isDev            = "isDev"
          :autohideLeftPanel = "autohideLeftPanel"
          :autohideTopPanel  = "autohideTopPanel"
          :showHidden        = "showHidden"
          :showMenuBar       = "showMenuBar"
          :tabsInSidePanel   = "tabsInSidePanel"
          :hasSelection      = "hasSelection"
          :openNewTabEnabled = "canOpenInNewTab"
          :openWithEnabled   = "canOpenWith"
          :useHtmlMenus      = "menuState.useHtmlMenus"
          :customFrame       = "customFrame"
          @changeView       = "ev => view = ev"
          @changeSortColumn = "ev => sortColumn = ev"
          @changeSortOrder  = "ev => sortOrder = ev"
          @changeGroup      = "ev => groupBy = ev"
          @toggleAutohideLeftPanel = "autohideLeftPanel = !autohideLeftPanel"
          @toggleAutohideTopPanel  = "autohideTopPanel = !autohideTopPanel"
          @toggleShowHidden = "showHidden = !showHidden"
          @toggleShowMenuBar = "showMenuBar = !showMenuBar"
          @toggleTabsInSidePanel = "tabsInSidePanel = !tabsInSidePanel"
          @toggleHtmlMenus = "toggleHtmlMenus"
          @toggleCustomFrame = "toggleCustomFrame"
          @changeTheme = "changeTheme"
        @selectAll       = "selectAllEntries"
        @invertSelection = "invertSelection"
        @rename          = "renameSelected"
        @moveToTrash     = "moveToTrashFromMenu"
        @copy            = "onCopy"
        @cut             = "onCut"
        @paste           = "onPaste"
        @createFile      = "createNewFile"
        @createFolder    = "createNewFolder"
        @open            = "menuOpen"
        @openInNewTab    = "menuOpenInNewTab"
        @openWith        = "openWithMenu"
        @properties      = "menuProperties"
        @about           = "openAbout"
        @github          = "openGithub"
        @hotkeys         = "openHotkeys"
      />
        <div
          class="top-panel-slider"
          :class="{ autohide: autohideTopPanel, 'panel-visible': topPanelVisible }"
        >
          <div class="top-panel-trigger" v-if="autohideTopPanel"
            @mouseenter="showTopPanel"
          ></div>
          <div class="top-panel-inner"
            @mouseenter="showTopPanel"
          >
          <menu-bar
            v-if="!customFrame"
            ref               = "menuBar"
            :class            = "{ hidden: !showMenuBar }"
            :view             = "view"
            :sortColumn       = "sortColumn"
            :sortOrder        = "sortOrder"
            :groupBy          = "groupBy"
            :isDev            = "isDev"
            :autohideLeftPanel = "autohideLeftPanel"
            :autohideTopPanel  = "autohideTopPanel"
            :showHidden        = "showHidden"
            :showMenuBar       = "showMenuBar"
            :tabsInSidePanel   = "tabsInSidePanel"
          :hasSelection      = "hasSelection"
          :openNewTabEnabled = "canOpenInNewTab"
          :openWithEnabled   = "canOpenWith"
            :useHtmlMenus      = "menuState.useHtmlMenus"
            :customFrame       = "customFrame"
            @changeView       = "ev => view = ev"
            @changeSortColumn = "ev => sortColumn = ev"
            @changeSortOrder  = "ev => sortOrder = ev"
            @changeGroup      = "ev => groupBy = ev"
            @toggleAutohideLeftPanel = "autohideLeftPanel = !autohideLeftPanel"
            @toggleAutohideTopPanel  = "autohideTopPanel = !autohideTopPanel"
            @toggleShowHidden = "showHidden = !showHidden"
            @toggleShowMenuBar = "showMenuBar = !showMenuBar"
            @toggleTabsInSidePanel = "tabsInSidePanel = !tabsInSidePanel"
            @toggleHtmlMenus = "toggleHtmlMenus"
            @toggleCustomFrame = "toggleCustomFrame"
            @changeTheme = "changeTheme"
          @selectAll       = "selectAllEntries"
          @invertSelection = "invertSelection"
          @rename          = "renameSelected"
          @moveToTrash     = "moveToTrashFromMenu"
          @copy            = "onCopy"
          @cut             = "onCut"
          @paste           = "onPaste"
          @createFile      = "createNewFile"
          @createFolder    = "createNewFolder"
          @open            = "menuOpen"
          @openInNewTab    = "menuOpenInNewTab"
          @openWith        = "openWithMenu"
          @properties      = "menuProperties"
          @about           = "openAbout"
          @github          = "openGithub"
          @hotkeys         = "openHotkeys"
          />
          <div class="tab-bar-row" v-if="!tabsInSidePanel">
            <tab-bar
              :tabs        = "tabs"
              :active-index = "activeTabIndex"
              @select      = "switchTab"
              @close       = "closeTab"
            />
            <window-controls
              v-if="controlsInTabBar"
              class="tab-bar-window-controls"
            />
          </div>
          <top-panel
            ref="topPanel"
            :autohideTopPanel   = "autohideTopPanel"
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
            :scale              = "iconSize"
            @scaling            = "ev => iconSize = ev"
            @togglePreviewPanel = "rightPanelVisible = !rightPanelVisible"
            :previewPanelVisible="rightPanelVisible"
            :showMenuBar        = "showMenuBar"
            :bookmarks          = "bookmarks"
            :isBookmarked       = "isBookmarked"
            @toggleBookmark     = "toggleBookmark"
            @openRootMenu       = "onOpenRootMenu"
          />
        </div>
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
          :tabs       = "tabs"
          :activeTabIndex = "activeTabIndex"
          :tabsInSidePanel = "tabsInSidePanel"
          :bookmarks  = "bookmarks"
          @resize     = "w => leftPanelWidth = w"
          @select     = "jump"
          @select-tab = "switchTab"
          @close-tab  = "closeTab"
          @remove-bookmark = "removeBookmark"
          @open-in-new-tab = "openInNewTab"
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
        :isTrash    = "isTrash"
        :renamingPath = "renamingPath"
        :renamingValue = "renamingValue"
        :clipboardMode = "clipboardMode"
        :clipboardPaths = "clipboardPaths"
        :focusedPath  = "previewPath"
        @changeSort = "changeSort"
        @openDir    = "openDir"
        @openFile   = "openFile"
        @select     = "selectEntry"
        @selectRange = "selectRange"
        @contextMenu = "onContextMenu"
        @backgroundContextMenu = "onBackgroundContextMenu"
        @confirmRename = "confirmRename"
        @cancelRename = "cancelRename"
        @update:renamingValue = "renamingValue = $event"
      />
      <transition name="trash-panel-fade">
        <div class="trash-panel" v-if="isTrash">
          <button class="trash-btn delete" @click="trashDelete">
            {{ trashDeleteLabel }}
          </button>
          <button class="trash-btn restore" @click="trashRestore">
            {{ trashRestoreLabel }}
          </button>
        </div>
      </transition>
      <preview-panel
        v-show="rightPanelVisible"
        :path   = "previewPath"
        :width  = "rightPanelWidth"
        @resize = "w => rightPanelWidth = w"
      />
    </div>
    <transition name="toast-fade">
      <div class="toast" v-if="toastVisible">{{ toastText }}</div>
    </transition>
    <transition name="trash-popup-fade">
      <div class="trash-confirm-overlay" v-if="trashPopupVisible" @click.self="cancelMoveToTrash">
        <div class="trash-confirm-popup">
          <div class="trash-confirm-text">
            <template v-if="trashPopupPaths.length === 1">
              Move "{{ trashPopupPaths[0].split('/').pop() }}" to trash?
            </template>
            <template v-else>
              Move {{ trashPopupPaths.length }} items to trash?
            </template>
          </div>
          <div class="trash-confirm-actions">
            <button class="trash-confirm-btn cancel" @click="cancelMoveToTrash">Cancel</button>
            <button class="trash-confirm-btn confirm" @click="executeMoveToTrash">Move</button>
          </div>
        </div>
      </div>
    </transition>
    <transition name="trash-popup-fade">
      <div class="trash-confirm-overlay" v-if="trashActionVisible" @click.self="cancelTrashAction">
        <div class="trash-confirm-popup">
          <div class="trash-confirm-text">
            <template v-if="trashActionMode === 'delete'">
              <template v-if="trashActionPaths.length === 1">
                Permanently delete "{{ trashActionPaths[0].split('/').pop() }}"?
              </template>
              <template v-else>
                Permanently delete {{ trashActionPaths.length }} files?
              </template>
            </template>
            <template v-if="trashActionMode === 'empty'">
              Permanently delete all {{ trashActionPaths.length }} items from trash?
            </template>
            <template v-if="trashActionMode === 'restore'">
              <template v-if="trashActionPaths.length === 1">
                Restore "{{ trashActionPaths[0].split('/').pop() }}"?
              </template>
              <template v-else>
                Restore {{ trashActionPaths.length }} files?
              </template>
            </template>
            <template v-if="trashActionMode === 'restore-all'">
              Restore all {{ trashActionPaths.length }} items from trash?
            </template>
          </div>
          <div class="trash-confirm-actions">
            <button class="trash-confirm-btn cancel" @click="cancelTrashAction">Cancel</button>
            <button class="trash-confirm-btn confirm" @click="executeTrashAction">
              {{ trashActionMode === 'delete' || trashActionMode === 'empty' ? 'Delete' : 'Restore' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="trash-popup-fade">
      <div class="trash-confirm-overlay" v-if="propsPopupVisible" @click.self="closeProperties">
        <div class="props-popup">
          <div class="props-title">{{ propsInfo.name }}</div>
          <div class="props-body">
            <div class="props-row" v-for="row in propsRows" :key="row.label">
              <div class="props-label">{{ row.label }}</div>
              <div class="props-value" :data-path="row.path">{{ row.value }}</div>
            </div>
          </div>
          <div class="trash-confirm-actions">
            <button class="trash-confirm-btn confirm props-close" @click="closeProperties">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <open-with-popup
      :path = "openWithPath"
      :visible = "openWithPopupVisible"
      @close = "openWithPopupVisible = false"
    />

    <menu-host />

    <transition name="trash-popup-fade">
      <div class="trash-confirm-overlay" v-if="aboutPopupVisible" @click.self="closeAbout">
        <div class="about-popup">
          <img class="about-header" :src="aboutHeader" alt="Sombra Manager" />
          <div class="about-title">Sombra Manager</div>
          <div class="about-body">
            <div class="about-row">
              <div class="about-label">Version</div>
              <div class="about-value">{{ version }}</div>
            </div>
            <div class="about-row">
              <div class="about-label">Developer</div>
              <div class="about-value">Mira Tosca</div>
            </div>
            <div class="about-row">
              <div class="about-label">Website</div>
              <div class="about-value">
                <span class="about-link" @click="openWebsite">sombraeax.github.io</span>
              </div>
            </div>
            <div class="about-row">
              <div class="about-label">Repository</div>
              <div class="about-value">
                <span class="about-link" @click="openGithub">github.com/SombraEAX/file-manager</span>
              </div>
            </div>
          </div>
          <div class="trash-confirm-actions">
            <button class="trash-confirm-btn confirm props-close" @click="closeAbout">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="trash-popup-fade">
      <div class="trash-confirm-overlay" v-if="hotkeysPopupVisible" @click.self="closeHotkeys">
        <div class="hotkeys-popup">
          <div class="props-title">Keyboard Shortcuts</div>
          <div class="hotkeys-body">
            <div class="hotkey-row" v-for="row in hotkeysRows" :key="row.keys + row.action">
              <div class="hotkey-keys">{{ row.keys }}</div>
              <div class="hotkey-action">{{ row.action }}</div>
            </div>
          </div>
          <div class="trash-confirm-actions">
            <button class="trash-confirm-btn confirm props-close" @click="closeHotkeys">Close</button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import DirectoryTree from './components/DirectoryTree.vue'
  import { theme, themeState, applyTheme, loadThemes } from './stores/theme'
  import TopPanel from './components/TopPanel.vue'
  import WorkZone from './components/WorkZone.vue'
  import PreviewPanel from './components/PreviewPanel.vue'
  import MenuBar from './components/MenuBar.vue'
  import MenuHost from './components/MenuHost.vue'
  import TabBar from './components/TabBar.vue'
  import WindowControls from './components/WindowControls.vue'
  import OpenWithPopup from './components/OpenWithPopup.vue'
  import aboutHeader from './assets/about-header.png'
  import pkg from '../package.json'
  import prettyBytes from 'pretty-bytes'
  import { tasks, createTask, updateTask, cancelTask, removeTask, pauseTask, resumeTask, createThrottledRunner } from './stores/tasks'
  import type { Task } from './stores/tasks'
  import type { MenuItemSpec, EntryStats, TaskResult, TrashItem } from './types/ipc'
  import type { Tab, Group, PropsInfo, SelectEvent, ContextMenuEvent, BackgroundContextMenuEvent, DirItem, SearchResultsEvent } from './types/domains'
  import { on, off } from './stores/events'
  import { menuState, toggleHtmlMenus, openMenu } from './stores/menus'
  import { IS_WEB } from './web'

  const username = window.electron.getUserName()
  const homedir  = `/home/${username}`
  const TRASH_PATH = 'trash://'
  const KB = 1024
  const MB = 1024 * 1024
  const GB = 1024 * 1024 * 1024

  function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e)
  }

  type MenuBarRef = { openRootMenu: (x: number, y: number) => void }
  type TopPanelRef = { closeDropdowns: () => void }
  type WorkZoneRef = { $el: HTMLElement; scrollToPath: (path: string) => void; itemsPerRow: number }

  export default defineComponent({
    name: 'App',
    
    components: {
      MenuBar,
      WorkZone,
      DirectoryTree,
      TopPanel,
      PreviewPanel,
      TabBar,
      MenuHost,
      WindowControls,
      OpenWithPopup
    },
    
    data(){      
      return {
        previewPath: null as string | null,
        aboutHeader,
        leftPanelWidth: 200,
        rightPanelWidth: 300,
        theme,
        dirs: [
          { name: username, pathname: homedir, caption: username },
          { name: '/', pathname: '/', caption: 'System root' }
        ] as DirItem[],
        tabs: [] as Tab[],
        activeTabIndex: -1,
        tabIdCounter: 0,
        iconSize: 120,
        view: 'table',
        entries: [] as EntryStats[],
        files: 0,
        folders: 0,
        sortColumn: 'name',
        sortOrder: 'asc',
        groupBy: null as string | null,
        isDev: location.href.includes('localhost'),
        version: pkg.version,
        toastText: '',
        toastVisible: false,
        toastTimer: null as ReturnType<typeof setTimeout> | null,
        searchResults: null as EntryStats[] | null,
        searchQuery: '',
        isSearchMode: false,
        searchVersion: 0,
        _restoreScrollPending: false,
        autohideLeftPanel: localStorage.getItem('autohideLeftPanel') === 'true',
        leftPanelVisible: false,
        _leftPanelTimer: null as ReturnType<typeof setTimeout> | null,
        autohideTopPanel: localStorage.getItem('autohideTopPanel') === 'true',
        topPanelVisible: false,
        _topPanelTimer: null as ReturnType<typeof setTimeout> | null,
        rightPanelVisible: localStorage.getItem('rightPanelVisible') !== 'false',
        showHidden: localStorage.getItem('showHidden') === 'true',
        showMenuBar: localStorage.getItem('showMenuBar') !== 'false',
        customFrame: IS_WEB ? false : localStorage.getItem('customFrame') === 'true',
        tabsInSidePanel: localStorage.getItem('tabsInSidePanel') === 'true',
        bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '[]') as string[],
        selectedMap: {} as Record<string, boolean>,
        lastClickedPath: null as string | null,
        renamingPath: null as string | null,
        renamingValue: '',
        trashPopupVisible: false,
        trashPopupPaths: [] as string[],
        trashActionVisible: false,
        trashActionMode: '',
        trashActionPaths: [] as string[],
        propsPopupVisible: false,
        propsInfo: {} as PropsInfo,
        openWithPopupVisible: false,
        openWithPath: '',
        aboutPopupVisible: false,
        hotkeysPopupVisible: false,
        clipboardPaths: [] as string[],
        clipboardMode: '',
        _undoThrottle: createThrottledRunner(),
        _onKeydown: null as ((e: KeyboardEvent) => void) | null,
        _allEntries: [] as EntryStats[],
        windowMaximized: false,
        _onWindowMaximized: null as ((...args: unknown[]) => void) | null,
      }
    },

    created(){
      this._undoThrottle = createThrottledRunner()
      applyTheme(themeState.current)
      loadThemes()
    },
    
    methods:{
    
      changeTheme(name: string){
        applyTheme(name)
      },

      async openDir(dirname: string){
        if(this.isTrash) return
        const absolute = dirname.startsWith('/')
        const target = absolute
          ? dirname
          : window.electron.join(this.currentDir, dirname)
        if(!target || target === this.currentDir) return
        if(!absolute){
          try {
            if(!(await window.electron.isDir(target))) return
          } catch(e) {
            return
          }
        }
        if(this.isSearchMode){
          this.isSearchMode = false;
          this.searchResults = null;
        }
        await this.jump(target);
      },

      async openFile(pathname: string){
        if(this.isTrash || !pathname) return
        try {
          const { error } = await window.electron.openFile(pathname)
          if(error) this.showToast('Failed to open: ' + error)
        } catch(e) {
          this.showToast('Failed to open: ' + (errorMessage(e)))
        }
      },

      onSearchResults({ query, results }: SearchResultsEvent){
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

      changeSort(col: string, sort: string){
        this.sortColumn = col
        this.sortOrder  = sort
      },      

      sortByProperty<T extends EntryStats>(array: T[], property: keyof T | undefined, order: string): T[] {
        if(!property) return array
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

      switchTab(index: number){
        if(index < 0 || index >= this.tabs.length || index === this.activeTabIndex) return;
        const el = (this.$refs.workzone as WorkZoneRef | undefined)?.$el.querySelector('.inner');
        if(el) this.tabs[this.activeTabIndex].scrollTop = el.scrollTop;
        this.activeTabIndex = index;
        this._restoreScrollPending = true;
        this.searchVersion++;
      },

      toggleBookmark(){
        if(!this.currentDir || this.currentDir === 'trash://') return
        if(this.bookmarks.includes(this.currentDir)){
          this.removeBookmark(this.currentDir)
        }else{
          this.bookmarks.push(this.currentDir)
          this._saveBookmarks()
        }
      },

      removeBookmark(pathname: string){
        const i = this.bookmarks.indexOf(pathname)
        if(i === -1) return
        this.bookmarks.splice(i, 1)
        this._saveBookmarks()
      },

      _saveBookmarks(){
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks))
      },

      closeTab(index: number){
        if(this.tabs.length <= 1) return;
        const wasActive = index === this.activeTabIndex;
        this.tabs.splice(index, 1);
        if(index < this.activeTabIndex){
          this.activeTabIndex--;
        }else if(index === this.activeTabIndex && this.activeTabIndex >= this.tabs.length){
          this.activeTabIndex = this.tabs.length - 1;
        }
        if(wasActive) this._restoreScrollPending = true;
        this.searchVersion++;
      },

      async openInNewTab(pathname: string){
        if(!pathname.startsWith('/') && pathname !== 'trash://')
          pathname = window.electron.join(this.currentDir, pathname);
        try {
          if(!(await window.electron.isDir(pathname))) throw new Error();
        } catch(e) {
          this.showToast('Folder not found');
          return;
        }
        this.tabs.push({ id: ++this.tabIdCounter, history: [pathname], historyIndex: 0, scrollTop: 0 });
        this.activeTabIndex = this.tabs.length - 1;
        this.searchVersion++;
      },

      async jump(pathname: string){
        if(!pathname || pathname === this.currentDir) return
        try {
          if(!(await window.electron.isDir(pathname))) throw new Error();
        } catch(e) {
          this.showToast('Folder not found');
          return;
        }
        this.isSearchMode = false;
        this.searchResults = null;
        this.searchVersion++;
        const tab = this.tabs[this.activeTabIndex];
        if(!tab) return
        tab.history[++tab.historyIndex] = pathname
        if(tab.history.length > tab.historyIndex + 1){
          tab.history.splice(tab.historyIndex + 1)
        }
      },
      
      async up(){
        this.isSearchMode = false;
        this.searchResults = null;
        await this.jump(this.currentDir.replace(/\/[^/]+\/?$/,'') || '/')
      },

      onContextMenu({ path, x, y }: ContextMenuEvent){
        if(this.isTrash){
          const items: MenuItemSpec[] = [{ label: 'Delete' }, { label: 'Restore' }]
          openMenu(items, x, y).then(index => {
            const paths = Object.keys(this.selectedMap)
            if(!paths.includes(path)) paths.push(path)
            if(index === 0) this.beginTrashAction('delete', paths)
            else if(index === 1) this.beginTrashAction('restore', paths)
          })
          return
        }
        let isDir = false
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries
        for(const entry of source){
          const entryPath = entry.path || window.electron.join(this.currentDir, entry.name)
          if(entryPath === path){
            isDir = entry.type === 'directory'
            break
          }
        }
        const items: MenuItemSpec[] = isDir
          ? [{ label: 'Open' }, { label: 'Open in new tab' }, { type: 'separator' }, { label: 'Rename' }, { label: 'Copy' }, { label: 'Cut' }, { type: 'separator' }, { label: 'Move to Trash' }, { type: 'separator' }, { label: 'Properties' }]
          : [{ label: 'Open' }, { label: 'Open with...' }, { type: 'separator' }, { label: 'Rename' }, { label: 'Copy' }, { label: 'Cut' }, { type: 'separator' }, { label: 'Move to Trash' }, { type: 'separator' }, { label: 'Properties' }]
        const pasteIndex = items.length
        if(this.clipboardPaths.length){
          items.push({ label: 'Paste' })
        }
        openMenu(items, x, y).then(index => {
          if(index === pasteIndex && this.clipboardPaths.length){ this.onPaste(); return }
          let idx = index
          for(let i = 0; i <= index; i++){
            if(items[i] && items[i].type === 'separator') idx--
          }
          if(isDir){
            if(idx === 0) this.openDir(path)
            else if(idx === 1) this.openInNewTab(path)
            else if(idx === 2) this.startRename(path)
            else if(idx === 3){
              const paths = Object.keys(this.selectedMap)
              if(!paths.includes(path)) paths.push(path)
              this.clipboardPaths = paths
              this.clipboardMode = 'copy'
            }
            else if(idx === 4){
              const paths = Object.keys(this.selectedMap)
              if(!paths.includes(path)) paths.push(path)
              this.clipboardPaths = paths
              this.clipboardMode = 'cut'
            }
            else if(idx === 5){
              const paths = Object.keys(this.selectedMap)
              if(!paths.includes(path)) paths.push(path)
              this.confirmMoveToTrash(paths)
            }
            else if(idx === 6) this.showProperties(path)
          }else{
            if(idx === 0) this.openFile(path)
            else if(idx === 1) this.showOpenWith(path)
            else if(idx === 2) this.startRename(path)
            else if(idx === 3){
              const paths = Object.keys(this.selectedMap)
              if(!paths.includes(path)) paths.push(path)
              this.clipboardPaths = paths
              this.clipboardMode = 'copy'
            }
            else if(idx === 4){
              const paths = Object.keys(this.selectedMap)
              if(!paths.includes(path)) paths.push(path)
              this.clipboardPaths = paths
              this.clipboardMode = 'cut'
            }
            else if(idx === 5){
              const paths = Object.keys(this.selectedMap)
              if(!paths.includes(path)) paths.push(path)
              this.confirmMoveToTrash(paths)
            }
            else if(idx === 6) this.showProperties(path)
          }
        })
      },
      onBackgroundContextMenu({ x, y }: BackgroundContextMenuEvent){
        if(this.isTrash){
          const items: MenuItemSpec[] = [{ label: 'Restore all' }, { label: 'Empty trash' }]
          openMenu(items, x, y).then(index => {
            if(index === 0) this.confirmRestoreAll()
            else if(index === 1) this.confirmEmptyTrash()
          })
          return
        }
        const items: MenuItemSpec[] = [
          { label: 'New folder' },
          { label: 'New file' }
        ]
        openMenu(items, x, y).then(index => {
          if(index === 0) this.createNewFolder()
          else if(index === 1) this.createNewFile()
        })
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
          if(this.$refs.topPanel) (this.$refs.topPanel as TopPanelRef).closeDropdowns()
        }, 300)
      },

      selectEntry(ev: SelectEvent){
        if (!ev) { this.clearSelection(); return }
        const { path, ctrl, shift } = ev
        this.previewPath = path
        if (ctrl) {
          if (this.selectedMap[path]) {
            const next = { ...this.selectedMap }; delete next[path]; this.selectedMap = next
          } else {
            this.selectedMap = { ...this.selectedMap, [path]: true }
          }
        } else if (shift && this.lastClickedPath) {
          const allPaths = []
          for (const group of this.groups) {
            for (const entry of group.entries) {
              allPaths.push(entry.path || window.electron.join(this.currentDir, entry.name))
            }
          }
          const lastIdx = allPaths.indexOf(this.lastClickedPath)
          const currIdx = allPaths.indexOf(path)
          if (~lastIdx && ~currIdx) {
            const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx]
            const next: Record<string, boolean> = {}
            for (let i = start; i <= end; i++) next[allPaths[i]] = true
            this.selectedMap = next
          } else {
            this.selectedMap = { [path]: true }
          }
        } else {
          this.selectedMap = { [path]: true }
        }
        this.lastClickedPath = path
      },
      selectRange(paths: string[], additive: boolean){
        let next: Record<string, boolean>
        if (additive) {
          next = { ...this.selectedMap }
          for (const p of paths) next[p] = true
        } else {
          next = {}
          for (const p of paths) next[p] = true
        }
        this.selectedMap = next
        this.lastClickedPath = paths.length ? paths[paths.length - 1] : null
        this.previewPath = paths.length ? paths[paths.length - 1] : null
      },
      clearSelection(){
        this.previewPath = null
        this.selectedMap = {}
        this.lastClickedPath = null
      },
      selectAllEntries(){
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries
        const next: Record<string, boolean> = {}
        for(const entry of source){
          const path = entry.path || window.electron.join(this.currentDir, entry.name)
          next[path] = true
        }
        this.selectedMap = next
        const paths = Object.keys(next)
        this.previewPath = paths.length ? paths[paths.length - 1] : null
        this.lastClickedPath = paths.length ? paths[paths.length - 1] : null
      },
      invertSelection(){
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries
        const next: Record<string, boolean> = {}
        for(const entry of source){
          const path = entry.path || window.electron.join(this.currentDir, entry.name)
          if(!this.selectedMap[path]) next[path] = true
        }
        this.selectedMap = next
        const paths = Object.keys(next)
        this.previewPath = paths.length ? paths[paths.length - 1] : null
        this.lastClickedPath = paths.length ? paths[paths.length - 1] : null
      },
      startRename(path: string){
        this.renamingPath = path
        const name = path.split('/').pop()
        this.renamingValue = name || ''
      },
      async confirmRename(newName: string){
        if(this.isTrash) return
        if(!this.renamingPath) return
        const oldPath = this.renamingPath
        this.renamingPath = null
        newName = (newName || '').trim()
        if(!newName){
          this.showToast('Name cannot be empty')
          return
        }
        if(/[/\0]/.test(newName)){
          this.showToast('Invalid characters in name')
          return
        }
        const dir = oldPath.replace(/\/[^/]+\/?$/, '') || '/'
        const newPath = window.electron.join(dir, newName)
        if(oldPath === newPath) return
        try{
          const entries = await window.electron.readdir(dir)
          if(entries.some(e => e.name === newName)){
            this.showToast('A file or folder with that name already exists')
            return
          }
        }catch(e){
          console.error('readdir check failed:', e)
        }
        try{
          await window.electron.rename(oldPath, newPath)
          if(this.selectedMap[oldPath]){
            const next = { ...this.selectedMap }
            delete next[oldPath]
            next[newPath] = true
            this.selectedMap = next
          }
          if(this.previewPath === oldPath) this.previewPath = newPath
          if(this.lastClickedPath === oldPath) this.lastClickedPath = newPath
          await this.refreshDir()
        }catch(e){
          console.error('rename failed:', e)
          this.showToast('Failed to rename')
        }
      },
      cancelRename(){
        this.renamingPath = null
      },
      async _uniqueName(dir: string, base: string): Promise<string>{
        let name = base
        let counter = 1
        const entries = await window.electron.readdir(dir)
        const names = new Set(entries.map(e => e.name))
        while(names.has(name)){
          counter++
          name = base + ' (' + counter + ')'
        }
        return name
      },
      async createNewFolder(){
        if(this.isTrash){
          this.showToast('Cannot create a folder here')
          return
        }
        try{
          const dir = this.currentDir
          const name = await this._uniqueName(dir, 'New folder')
          const newPath = window.electron.join(dir, name)
          await window.electron.mkdir(newPath)
          this.selectedMap = { [newPath]: true }
          this.lastClickedPath = newPath
          this.previewPath = newPath
          await this.refreshDir()
          this.startRename(newPath)
        }catch(e){
          console.error('create folder failed:', e)
          this.showToast('Failed to create folder')
        }
      },
      async createNewFile(){
        if(this.isTrash){
          this.showToast('Cannot create a file here')
          return
        }
        try{
          const dir = this.currentDir
          const name = await this._uniqueName(dir, 'New file')
          const newPath = window.electron.join(dir, name)
          await window.electron.writeFile(newPath, '')
          this.selectedMap = { [newPath]: true }
          this.lastClickedPath = newPath
          this.previewPath = newPath
          await this.refreshDir()
          this.startRename(newPath)
        }catch(e){
          console.error('create file failed:', e)
          this.showToast('Failed to create file')
        }
      },
      renameSelected(){
        if(this.isTrash) return
        const paths = Object.keys(this.selectedMap)
        if(paths.length === 1){
          this.startRename(paths[0])
        }
      },
      _entryType(path: string){
        if(path === 'trash://') return 'directory'
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries
        for(const entry of source){
          const entryPath = entry.path || window.electron.join(this.currentDir, entry.name)
          if(entryPath === path) return entry.type
        }
        return null
      },
      focusedPath(): string | undefined{
        return this.lastClickedPath || Object.keys(this.selectedMap)[0]
      },
      async menuOpen(){
        const path = this.focusedPath()
        if(!path){
          if(this.currentDir) await this.jump(this.currentDir)
          return
        }
        if(this._entryType(path) === 'directory') await this.openDir(path)
        else await this.openFile(path)
      },
      async menuOpenInNewTab(){
        const path = this.focusedPath()
        if(!path){
          if(this.currentDir) await this.openInNewTab(this.currentDir)
          return
        }
        if(this._entryType(path) === 'directory') await this.openInNewTab(path)
        else await this.openFile(path)
      },
      menuProperties(){
        const path = this.focusedPath() || this.currentDir
        if(path) this.showProperties(path)
      },
      openWithMenu(){
        const path = this.focusedPath()
        if(path) this.showOpenWith(path)
      },
      showOpenWith(path: string){
        this.openWithPath = path
        this.openWithPopupVisible = true
      },
      moveToTrashFromMenu(){
        if(this.isTrash) return
        const paths = Object.keys(this.selectedMap)
        if(!paths.length) return
        this.confirmMoveToTrash(paths)
      },
      onCopy(){
        if(this.isTrash) return
        const paths = Object.keys(this.selectedMap)
        if(!paths.length) return
        this.clipboardPaths = [...paths]
        this.clipboardMode = 'copy'
      },
      onOpenRootMenu(x: number, y: number){
        const mb = this.$refs.menuBar as MenuBarRef | undefined
        if (mb) mb.openRootMenu(x, y)
      },
      onCut(){
        if(this.isTrash) return
        const paths = Object.keys(this.selectedMap)
        if(!paths.length) return
        this.clipboardPaths = [...paths]
        this.clipboardMode = 'cut'
      },
      async onPaste(){
        if(!this.clipboardPaths.length) return
        if(this.isTrash){
          this.showToast('Cannot paste here')
          return
        }
        const paths = [...this.clipboardPaths]
        const destDir = this.currentDir
        if(this.clipboardMode === 'cut'){
          let totalBytes = 0
          const fileSizes: number[] = []
          for (const p of paths) {
            try {
              const s = await window.electron.stat(p)
              totalBytes += s.size
              fileSizes.push(s.size)
            } catch (e) {
              fileSizes.push(0)
            }
          }
          const task = createTask(this.taskName(paths, 'Move'), {
            originalPaths: [...paths],
            destDir,
            operation: 'move',
            errorLog: []
          })
          task.totalSize = totalBytes
          task.from = paths.length === 1 ? paths[0] : paths[0] + ' (+' + (paths.length - 1) + ')'
          task.to = destDir
          const total = paths.length
          let done = 0
          let errors = 0
          window.electron.ipcRenderer.on('move-progress', (_, { taskId, copiedBytes: bytes }) => {
            if(task.id !== taskId) return
            if(task.status === 'cancelled' || task.status === 'done' || task.status === 'undone') return
            const completedBytes = fileSizes.slice(0, done).reduce((a, b) => a + b, 0)
            const totalCopied = completedBytes + (bytes || 0)
            const totalForProgress = totalBytes > 0 ? totalBytes : 1048576
            const progress = Math.min(Math.round((totalCopied / totalForProgress) * 100), 99)
            updateTask(task.id, { progress, totalSize: totalBytes })
          })
          for(const src of paths){
            const name = src.split('/').pop()
            const dest = destDir + '/' + name
            try {
              const result = await window.electron.ipcRenderer.invoke('move-file', src, dest, task.id)
              if(result && result.cancelled) break
              if(result && result.error) throw new Error(result.error)
              done++
              const cur = task.progress || 0
              const fileProgress = Math.round((done / total) * 100)
              updateTask(task.id, { progress: Math.max(cur, fileProgress) })
            } catch(e){
              errors++
              if(task.data && task.data.errorLog) task.data.errorLog.push(errorMessage(e))
              this.showToast('Failed to move: ' + errorMessage(e))
            }
          }
          window.electron.ipcRenderer.removeAllListeners('move-progress')
          this.clipboardPaths = []
          this.clipboardMode = ''
          if (task.status === 'cancelling') {
            cancelTask(task.id)
            await this.refreshDir()
            return
          }
          const successCount = done
          updateTask(task.id, {
            progress: 100,
            status: errors && !successCount ? 'error' : errors ? 'partial' : 'done',
            name: this.taskName(paths, 'Move'),
            timeRemaining: 0
          })
          await this.refreshDir()
          return
        }
        const task = createTask(this.taskName(paths, 'Copy'), {
          originalPaths: [...paths],
          destDir,
          operation: 'copy',
          errorLog: []
        })
        task.from = paths.length === 1 ? paths[0] : paths[0] + ' (+' + (paths.length - 1) + ')'
        task.to = destDir
          window.electron.ipcRenderer.on('file-copy-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
          if(task.status === 'cancelled' || task.status === 'paused') return
          const progress = totalBytes > 0 && copiedBytes != null
            ? Math.round((copiedBytes / totalBytes) * 100)
            : Math.round((done / total) * 100)
          const successCount = done - errors
          updateTask(task.id, {
            progress,
            totalSize: totalBytes || task.totalSize,
            timeRemaining: null,
            status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
          })
        })
        try {
          const result = await window.electron.ipcRenderer.invoke('file-copy', JSON.parse(JSON.stringify(paths)), destDir, task.id)
          window.electron.ipcRenderer.removeAllListeners('file-copy-progress')
          if(task.status === 'cancelled'){
            await this.refreshDir()
            return
          }
          const successCount = paths.length - result.errors
          updateTask(task.id, {
            progress: 100,
            status: result.errors ? (successCount > 0 ? 'partial' : 'error') : 'done',
            name: this.taskName(paths, 'Copy'),
            timeRemaining: 0
          })
          if(result.copiedPaths) task.data.copiedPaths = result.copiedPaths
          if(result.errors && result.lastError && task.data.errorLog) task.data.errorLog.push(result.lastError)
          await this.refreshDir()
        } catch(e) {
          window.electron.ipcRenderer.removeAllListeners('file-copy-progress')
          if(task.status === 'cancelled'){
            await this.refreshDir()
            return
          }
          if(task.data && task.data.errorLog) task.data.errorLog.push(errorMessage(e))
          updateTask(task.id, { status: 'error', name: this.taskName(paths, 'Copy'), progress: 100 })
          this.showToast('Failed to copy files')
        }
      },
      taskFileLabel(paths: string[]){
        return paths.length === 1 ? paths[0].split('/').pop() : paths.length + ' files'
      },
      taskName(paths: string[], action: string){
        return action + ' ' + this.taskFileLabel(paths)
      },
      prepareTrashPaths(paths: string[]): string[] {
        const sorted = [...paths].sort((a, b) => b.length - a.length)
        const result: string[] = []
        for(const p of sorted){
          if(!result.some(q => q.startsWith(p + '/'))){
            result.push(p)
          }
        }
        return result
      },
      confirmMoveToTrash(paths: string[]){
        const cleaned = this.prepareTrashPaths(paths)
        console.log('[trash] cleaned:', cleaned)
        if(!cleaned.length) return
        this.trashPopupPaths = cleaned
        this.trashPopupVisible = true
      },
      cancelMoveToTrash(){
        this.trashPopupVisible = false
        this.trashPopupPaths = []
      },
      async executeMoveToTrash(){
        const paths = this.trashPopupPaths
        this.trashPopupVisible = false
        this.trashPopupPaths = []
        if(!paths.length) return

        const parentDir = paths[0].replace(/\/[^/]+\/?$/, '') || '/'
        const task = createTask('Move ' + this.taskFileLabel(paths) + ' to trash', {
          originalPaths: [...paths],
          parentDir,
          operation: 'trash',
          errorLog: []
        })
        task.from = paths.length === 1 ? paths[0] : paths[0] + ' (+' + (paths.length - 1) + ')'

        window.electron.ipcRenderer.on('trash-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
          if(task.status === 'cancelled' || task.status === 'paused') return
          const progress = totalBytes > 0 && copiedBytes != null
            ? Math.round((copiedBytes / totalBytes) * 100)
            : Math.round((done / total) * 100)
          const successCount = done - errors
          updateTask(task.id, {
            progress,
            totalSize: totalBytes || task.totalSize,
            timeRemaining: null,
            status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
          })
        })

        try {
          const result = await window.electron.ipcRenderer.invoke('trash-items', JSON.parse(JSON.stringify(paths)), task.id)
          window.electron.ipcRenderer.removeAllListeners('trash-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            await this.refreshDir()
            return
          }
          const successCount = paths.length - result.errors
          updateTask(task.id, {
            progress: 100,
            status: result.errors ? (successCount > 0 ? 'partial' : 'error') : 'done',
            name: 'Move ' + this.taskFileLabel(paths) + ' to trash',
            timeRemaining: 0
          })
          if(result.errors && result.lastError && task.data.errorLog) task.data.errorLog.push(result.lastError)
          if(result.errors){
            this.showToast('Failed to move to trash: ' + result.lastError)
          }else{
            this.clearSelection()
            await this.refreshDir()
          }
        } catch(e) {
          window.electron.ipcRenderer.removeAllListeners('trash-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            return
          }
          if(task.data && task.data.errorLog) task.data.errorLog.push(errorMessage(e))
          updateTask(task.id, { status: 'error', name: 'Move ' + this.taskFileLabel(paths) + ' to trash', progress: 100 })
          this.showToast('Failed to move to trash')
        }
      },
      trashDelete(){
        let paths = Object.keys(this.selectedMap)
        if(!paths.length){
          paths = this.entries.map(e => e.path || window.electron.join(this.currentDir, e.name))
        }
        this.beginTrashAction('delete', paths)
      },
      trashRestore(){
        let paths = Object.keys(this.selectedMap)
        if(!paths.length){
          paths = this.entries.map(e => e.path || window.electron.join(this.currentDir, e.name))
        }
        this.beginTrashAction('restore', paths)
      },
      confirmEmptyTrash(){
        const paths = this.entries.map(e => e.path || window.electron.join(this.currentDir, e.name))
        if(!paths.length){
          this.showToast('Trash is empty')
          return
        }
        this.beginTrashAction('empty', paths)
      },
      confirmRestoreAll(){
        const paths = this.entries.map(e => e.path || window.electron.join(this.currentDir, e.name))
        if(!paths.length){
          this.showToast('Trash is empty')
          return
        }
        this.beginTrashAction('restore-all', paths)
      },
      beginTrashAction(mode: string, paths: string[]){
        paths = this.prepareTrashPaths(paths)
        if(!paths.length) return
        this.trashActionMode = mode
        this.trashActionPaths = paths
        this.trashActionVisible = true
      },
      trashNameOf(path: string){
        return path.replace(/^trash:\/\//, '')
      },
      toTrashRealPath(path: string){
        return window.electron.trashDirs().files + '/' + this.trashNameOf(path)
      },
      cancelTrashAction(){
        this.trashActionVisible = false
        this.trashActionMode = ''
        this.trashActionPaths = []
      },
      async _runTrashDelete(paths: string[], parentDir: string | undefined): Promise<{ cancelled?: boolean; task?: Task; result?: TaskResult }> {
        const task = createTask('Delete ' + this.taskFileLabel(paths) + ' from trash', {
          originalPaths: [...paths],
          parentDir,
          operation: 'trash-delete',
          errorLog: []
        })
        window.electron.ipcRenderer.on('trash-permanent-delete-progress', (_, { done, total, errors }) => {
          if(task.status === 'cancelled' || task.status === 'paused') return
          const successCount = done - errors
          updateTask(task.id, {
            progress: Math.round((done / total) * 100),
            timeRemaining: null,
            status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
          })
        })
        try {
          const result = await window.electron.ipcRenderer.invoke('trash-permanent-delete', JSON.parse(JSON.stringify(paths)), task.id)
          window.electron.ipcRenderer.removeAllListeners('trash-permanent-delete-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            return { cancelled: true }
          }
          const successCount = paths.length - result.errors
          updateTask(task.id, {
            progress: 100,
            status: result.errors ? (successCount > 0 ? 'partial' : 'error') : 'done',
            name: 'Delete ' + this.taskFileLabel(paths) + ' from trash',
            timeRemaining: 0
          })
          if(result.errors && result.lastError && task.data.errorLog) task.data.errorLog.push(result.lastError)
          return { task, result }
        } catch(e) {
          window.electron.ipcRenderer.removeAllListeners('trash-permanent-delete-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            return { cancelled: true }
          }
          if(task.data && task.data.errorLog) task.data.errorLog.push(errorMessage(e))
          updateTask(task.id, { status: 'error', name: 'Delete ' + this.taskFileLabel(paths) + ' from trash', progress: 100 })
          return { task, result: { errors: 1, lastError: errorMessage(e) } as TaskResult }
        }
      },
      async _runTrashRestore(restoreItems: TrashItem[], parentDir: string | undefined, originalPaths: string[]): Promise<{ cancelled?: boolean; task?: Task; result?: TaskResult }> {
        const task = createTask('Restore ' + this.taskFileLabel(originalPaths) + ' from trash', {
          originalPaths: [...originalPaths],
          trashNames: restoreItems.map(i => i.trashName),
          parentDir,
          operation: 'trash-restore',
          errorLog: []
        })
        task.to = parentDir
        window.electron.ipcRenderer.on('trash-restore-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
          if(task.status === 'cancelled' || task.status === 'paused') return
          const progress = totalBytes > 0 && copiedBytes != null
            ? Math.round((copiedBytes / totalBytes) * 100)
            : Math.round((done / total) * 100)
          const successCount = done - errors
          updateTask(task.id, {
            progress,
            totalSize: totalBytes || task.totalSize,
            timeRemaining: null,
            status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
          })
        })
        try {
          const result = await window.electron.ipcRenderer.invoke('trash-restore-items', JSON.parse(JSON.stringify(restoreItems)), task.id)
          window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            await this.refreshDir()
            return { cancelled: true }
          }
          const successCount = originalPaths.length - result.errors
          updateTask(task.id, {
            progress: 100,
            status: result.errors ? (successCount > 0 ? 'partial' : 'error') : 'done',
            name: 'Restore ' + this.taskFileLabel(originalPaths) + ' from trash',
            timeRemaining: 0
          })
          if(result.errors && result.lastError && task.data.errorLog) task.data.errorLog.push(result.lastError)
          return { task, result }
        } catch(e) {
          window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            return { cancelled: true }
          }
          if(task.data && task.data.errorLog) task.data.errorLog.push(errorMessage(e))
          updateTask(task.id, { status: 'error', name: 'Restore ' + this.taskFileLabel(originalPaths) + ' from trash', progress: 100 })
          return { task, result: { errors: 1, lastError: errorMessage(e) } as TaskResult }
        }
      },
      async executeTrashAction(){
        const mode = this.trashActionMode
        const paths = this.trashActionPaths
        this.trashActionVisible = false
        this.trashActionMode = ''
        this.trashActionPaths = []
        if(!paths.length) return

        if(mode === 'delete' || mode === 'empty'){
          const realPaths = paths.map(p => this.toTrashRealPath(p))
          const { cancelled, result } = await this._runTrashDelete(realPaths, this.currentDir)
          if(cancelled) return
          if(result && result.errors){
            this.showToast('Failed to delete: ' + result.lastError)
          }else{
            this.clearSelection()
            await this.refreshDir()
          }
        }

        if(mode === 'restore' || mode === 'restore-all'){
          const trashInfoDir = window.electron.trashDirs().info
          const allTrashInfo = await window.electron.readAllTrashInfo(trashInfoDir)
          const restoreItems = paths.map(p => {
            const name = this.trashNameOf(p)
            const found = allTrashInfo.find(i => i.trashName === name)
            return { trashName: name, originalPath: found ? found.originalPath : p }
          })

          const parentDir = restoreItems.length && restoreItems[0].originalPath
            ? restoreItems[0].originalPath.replace(/\/[^/]+\/?$/, '') || '/'
            : '/'

          const { cancelled, result } = await this._runTrashRestore(restoreItems, parentDir, restoreItems.map(i => i.originalPath))
          if(cancelled) return
          if(result && result.errors){
            this.showToast('Failed to restore: ' + result.lastError)
          }else{
            this.clearSelection()
            if(mode === 'restore-all'){
              await this.refreshDir()
              return
            }
            const names = restoreItems.map(i => i.originalPath.split('/').pop() || '')
            await this._openLocationAndReveal(parentDir, names)
          }
        }
      },
      onTaskCancel(taskId: number){
        const task = tasks.find(t => t.id === taskId)
        if(task){
          const op = task.data && task.data.operation
          if(op === 'trash') window.electron.ipcRenderer.send('trash-cancel', taskId)
          else if(op === 'trash-restore') window.electron.ipcRenderer.send('trash-restore-cancel', taskId)
          else if(op === 'trash-delete') window.electron.ipcRenderer.send('trash-delete-cancel', taskId)
          else if(op === 'copy') window.electron.ipcRenderer.send('file-copy-cancel', taskId)
          else if(op === 'move'){
            window.electron.ipcRenderer.send('move-cancel', taskId)
            const task_ = tasks.find(t => t.id === taskId)
            const original = task_ && task_.data ? task_.data.originalPaths : undefined
            const label = original ? this.taskName(original, 'Move') : ''
            updateTask(taskId, { status: 'cancelling', name: label })
            return
          }
        }
        cancelTask(taskId)
      },
      onTaskPause(taskId: number){
        const task = tasks.find(t => t.id === taskId)
        if(task){
          const op = task.data && task.data.operation
          if(op === 'copy') window.electron.ipcRenderer.send('file-copy-pause', taskId)
          else if(op === 'trash') window.electron.ipcRenderer.send('trash-pause', taskId)
          else if(op === 'trash-restore') window.electron.ipcRenderer.send('trash-restore-pause', taskId)
          else if(op === 'trash-delete') window.electron.ipcRenderer.send('trash-delete-pause', taskId)
          updateTask(taskId, { status: 'paused' })
        }
      },
      onTaskResume(taskId: number){
        const task = tasks.find(t => t.id === taskId)
        if(task){
          const op = task.data && task.data.operation
          if(op === 'copy') window.electron.ipcRenderer.send('file-copy-resume', taskId)
          else if(op === 'trash') window.electron.ipcRenderer.send('trash-resume', taskId)
          else if(op === 'trash-restore') window.electron.ipcRenderer.send('trash-restore-resume', taskId)
          else if(op === 'trash-delete') window.electron.ipcRenderer.send('trash-delete-resume', taskId)
          updateTask(taskId, { status: 'active' })
        }
      },
      async onTaskRetry(task: Task){
        const oldId = task.id
        const op = task.data && task.data.operation
        if(op === 'trash' && task.data.originalPaths){
          const paths = task.data.originalPaths
          removeTask(oldId)
          const parentDir = paths[0].replace(/\/[^/]+\/?$/, '') || '/'
          const newTask = createTask('Move ' + this.taskFileLabel(paths) + ' to trash', {
            originalPaths: [...paths],
            parentDir,
            operation: 'trash',
            errorLog: []
          })
          newTask.from = paths.length === 1 ? paths[0] : paths[0] + ' (+' + (paths.length - 1) + ')'
          window.electron.ipcRenderer.on('trash-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
            const progress = totalBytes > 0 && copiedBytes != null
              ? Math.round((copiedBytes / totalBytes) * 100)
              : Math.round((done / total) * 100)
            const successCount = done - errors
            updateTask(newTask.id, {
              progress,
              totalSize: totalBytes || newTask.totalSize,
              timeRemaining: null,
              status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
            })
          })
          window.electron.ipcRenderer.invoke('trash-items', JSON.parse(JSON.stringify(paths)), newTask.id).then(result => {
            window.electron.ipcRenderer.removeAllListeners('trash-progress')
            if(newTask.status === 'cancelled'){
              removeTask(newTask.id)
              this.refreshDir()
              return
            }
            const successCount = paths.length - result.errors
            updateTask(newTask.id, {
              progress: 100,
              status: result.errors ? (successCount > 0 ? 'partial' : 'error') : 'done',
              name: 'Move ' + this.taskFileLabel(paths) + ' to trash',
              timeRemaining: 0
            })
            if(result.errors && result.lastError && newTask.data.errorLog) newTask.data.errorLog.push(result.lastError)
            if(result.errors){
              this.showToast('Failed to move to trash: ' + result.lastError)
            }else{
              this.clearSelection()
              this.refreshDir()
            }
          }).catch(() => {
            window.electron.ipcRenderer.removeAllListeners('trash-progress')
            if(newTask.data && newTask.data.errorLog) newTask.data.errorLog.push('Failed to move to trash')
            updateTask(newTask.id, { status: 'error', name: 'Move ' + this.taskFileLabel(paths) + ' to trash', progress: 100 })
            this.showToast('Failed to move to trash')
          })
        }
        if(op === 'trash-delete' && task.data.originalPaths){
          removeTask(oldId)
          const { cancelled, result } = await this._runTrashDelete(task.data.originalPaths, task.data.parentDir)
          if(cancelled) return
          if(result && result.errors){
            this.showToast('Failed to delete: ' + result.lastError)
          }else{
            this.clearSelection()
            await this.refreshDir()
          }
        }
        if(op === 'trash-restore' && task.data.trashNames && task.data.originalPaths){
          const originalPaths = task.data.originalPaths
          const items = task.data.trashNames.map((name, i) => ({
            trashName: name,
            originalPath: originalPaths[i]
          }))
          const parentDir = task.data.parentDir
          removeTask(oldId)
          const { cancelled, result } = await this._runTrashRestore(items, parentDir, originalPaths)
          if(cancelled) return
          if(result && result.errors){
            this.showToast('Failed to restore: ' + result.lastError)
          }else{
            this.clearSelection()
            await this.refreshDir()
          }
        }
        if(op === 'copy' && task.data.originalPaths){
          const paths = task.data.originalPaths
          const destDir = task.data.destDir || ''
          removeTask(oldId)
          const newTask = createTask(this.taskName(paths, 'Copy'), {
            originalPaths: [...paths],
            destDir,
            operation: 'copy',
            errorLog: []
          })
          newTask.from = paths.length === 1 ? paths[0] : paths[0] + ' (+' + (paths.length - 1) + ')'
          newTask.to = destDir
          window.electron.ipcRenderer.on('file-copy-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
            if(newTask.status === 'cancelled' || newTask.status === 'paused') return
            const progress = totalBytes > 0 && copiedBytes != null
              ? Math.round((copiedBytes / totalBytes) * 100)
              : Math.round((done / total) * 100)
            const errorCount = (newTask.data.errorLog || []).length
            updateTask(newTask.id, {
              progress,
              totalSize: totalBytes || newTask.totalSize,
              timeRemaining: null,
              status: done >= total ? (errors > errorCount ? (errorCount >= total ? 'error' : 'partial') : 'done') : 'active'
            })
          })
          try {
            const result = await window.electron.ipcRenderer.invoke('file-copy', JSON.parse(JSON.stringify(paths)), destDir, newTask.id)
            window.electron.ipcRenderer.removeAllListeners('file-copy-progress')
            if(newTask.status === 'cancelled'){
              removeTask(newTask.id)
              await this.refreshDir()
              return
            }
            const errorCount = (newTask.data.errorLog || []).length
            updateTask(newTask.id, {
              progress: 100,
              status: result.errors ? (errorCount >= paths.length ? 'error' : 'partial') : 'done',
              name: this.taskName(paths, 'Copy'),
              timeRemaining: 0
            })
            if(result.copiedPaths) newTask.data.copiedPaths = result.copiedPaths
            await this.refreshDir()
          } catch(e) {
            window.electron.ipcRenderer.removeAllListeners('file-copy-progress')
            if(newTask.status === 'cancelled'){
              await this.refreshDir()
              return
            }
            if(newTask.data && newTask.data.errorLog) newTask.data.errorLog.push(errorMessage(e))
            updateTask(newTask.id, { status: 'error', name: this.taskName(paths, 'Copy'), progress: 100 })
            this.showToast('Failed to copy files')
          }
        }
      },
      async onTaskRetryFailed(task: Task){
        const oldId = task.id
        const op = task.data && task.data.operation
        if(op === 'copy' && task.data.originalPaths && task.data.failedPaths){
          const paths = task.data.failedPaths
          const destDir = task.data.destDir || ''
          removeTask(oldId)
          const newTask = createTask(this.taskName(paths, 'Copy'), {
            originalPaths: [...paths],
            destDir,
            operation: 'copy',
            errorLog: []
          })
          newTask.from = paths.length === 1 ? paths[0] : paths[0] + ' (+' + (paths.length - 1) + ')'
          newTask.to = destDir
          window.electron.ipcRenderer.on('file-copy-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
            if(newTask.status === 'cancelled' || newTask.status === 'paused') return
            const progress = totalBytes > 0 && copiedBytes != null
              ? Math.round((copiedBytes / totalBytes) * 100)
              : Math.round((done / total) * 100)
            const errorCount = (newTask.data.errorLog || []).length
            updateTask(newTask.id, {
              progress,
              totalSize: totalBytes || newTask.totalSize,
              timeRemaining: null,
              status: done >= total ? (errors > errorCount ? (errorCount >= total ? 'error' : 'partial') : 'done') : 'active'
            })
          })
          try {
            const result = await window.electron.ipcRenderer.invoke('file-copy', JSON.parse(JSON.stringify(paths)), destDir, newTask.id)
            window.electron.ipcRenderer.removeAllListeners('file-copy-progress')
            if(newTask.status === 'cancelled'){
              removeTask(newTask.id)
              await this.refreshDir()
              return
            }
            const errorCount = (newTask.data.errorLog || []).length
            updateTask(newTask.id, {
              progress: 100,
              status: result.errors ? (errorCount >= paths.length ? 'error' : 'partial') : 'done',
              name: this.taskName(paths, 'Copy'),
              timeRemaining: 0
            })
            if(result.copiedPaths) newTask.data.copiedPaths = result.copiedPaths
            await this.refreshDir()
          } catch(e) {
            window.electron.ipcRenderer.removeAllListeners('file-copy-progress')
            if(newTask.status === 'cancelled'){
              await this.refreshDir()
              return
            }
            if(newTask.data && newTask.data.errorLog) newTask.data.errorLog.push(errorMessage(e))
            updateTask(newTask.id, { status: 'error', name: this.taskName(paths, 'Copy'), progress: 100 })
            this.showToast('Failed to copy files')
          }
        }
      },
      onTaskUndo(task: Task){
        if(!task.data || !task.data.originalPaths) return
        if(task.data.operation === 'trash-delete') return
        this._undoThrottle(task.id, () => this._performUndo(task))
      },
      async _performUndo(task: Task){
        const op = task.data.operation

        if(op === 'move'){
          const destDir = task.data.destDir || ''
          const paths = task.data.originalPaths || []
          const items = paths.map(p => ({
            original: p,
            dest: destDir + '/' + p.split('/').pop()
          }))
          const label = this.taskName(paths, 'Move back')
          updateTask(task.id, { status: 'active', name: label, progress: 0, from: destDir, to: '' })
          window.electron.ipcRenderer.on('trash-restore-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
            if(task.status === 'cancelled' || task.status === 'paused') return
            const progress = totalBytes > 0 && copiedBytes != null
              ? Math.round((copiedBytes / totalBytes) * 100)
              : Math.round((done / total) * 100)
            const successCount = done - errors
            updateTask(task.id, {
              progress,
              timeRemaining: null,
              status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
            })
          })
          try {
            const result = await window.electron.ipcRenderer.invoke('move-undo', items, task.id)
            window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
            if(task.status === 'cancelled'){
              removeTask(task.id)
              await this.refreshDir()
              return
            }
            if(result.errors){
              updateTask(task.id, { status: 'error', name: label, progress: 100 })
              this.showToast('Failed to undo move: ' + result.lastError)
            }else{
              updateTask(task.id, { status: 'undone', name: label, progress: 100 })
              if(this.currentDir === destDir){
                await this.refreshDir()
              }else{
                await this.jump(destDir)
                await this.refreshDir()
              }
            }
          }catch(e){
            window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
            updateTask(task.id, { status: 'error', name: label, progress: 100 })
          }
          return
        }

        if(op === 'copy'){
          const destDir = task.data.destDir || ''
          const paths = task.data.originalPaths || []
          const copiedPaths = task.data.copiedPaths || paths.map(p => destDir + '/' + p.split('/').pop())
          const label = this.taskName(paths, 'Remove')
          updateTask(task.id, { status: 'active', name: label, progress: 0, from: destDir, to: '' })
          window.electron.ipcRenderer.on('trash-restore-progress', (_, { done, total, errors }) => {
            if(task.status === 'cancelled' || task.status === 'paused') return
            const progress = total > 0 ? Math.round((done / total) * 100) : 0
            const successCount = done - errors
            updateTask(task.id, {
              progress,
              timeRemaining: null,
              status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
            })
          })
          try {
            const result = await window.electron.ipcRenderer.invoke('copy-undo', JSON.parse(JSON.stringify(copiedPaths)), task.id)
            window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
            if(task.status === 'cancelled'){
              removeTask(task.id)
              await this.refreshDir()
              return
            }
            if(result.errors){
              updateTask(task.id, { status: 'error', name: label, progress: 100 })
              this.showToast('Failed to remove: ' + result.lastError)
            }else{
              updateTask(task.id, { status: 'undone', name: label, progress: 100 })
              if(this.currentDir === destDir){
                await this.refreshDir()
              }else{
                await this.jump(destDir)
                await this.refreshDir()
              }
            }
          }catch(e){
            window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
            updateTask(task.id, { status: 'error', name: label, progress: 100 })
          }
          return
        }

        if(op === 'trash-restore'){
          const parentDir = task.data.parentDir || ''
          const paths = task.data.originalPaths || (task.data.trashNames || []).map(name => parentDir + '/' + name)
          const label = 'Move ' + this.taskFileLabel(paths) + ' back to trash'
          updateTask(task.id, { status: 'active', name: label, progress: 0, from: parentDir, to: '' })
          window.electron.ipcRenderer.on('trash-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
            if(task.status === 'cancelled' || task.status === 'paused') return
            const progress = totalBytes > 0 && copiedBytes != null
              ? Math.round((copiedBytes / totalBytes) * 100)
              : Math.round((done / total) * 100)
            const successCount = done - errors
            updateTask(task.id, {
              progress,
              totalSize: totalBytes || task.totalSize,
              timeRemaining: null,
              status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
            })
          })
          try {
            const result = await window.electron.ipcRenderer.invoke('trash-items', JSON.parse(JSON.stringify(paths)), task.id)
            window.electron.ipcRenderer.removeAllListeners('trash-progress')
            if(task.status === 'cancelled'){
              removeTask(task.id)
              await this.refreshDir()
              return
            }
            if(result.errors){
              updateTask(task.id, { status: 'error', name: label, progress: 100 })
              this.showToast('Failed to undo restore: ' + result.lastError)
            }else{
              updateTask(task.id, { status: 'undone', name: label, progress: 100 })
              await this._openLocationAndReveal(TRASH_PATH, (task.data.trashNames || []))
            }
          }catch(e){
            window.electron.ipcRenderer.removeAllListeners('trash-progress')
            updateTask(task.id, { status: 'error', name: label, progress: 100 })
            this.showToast('Failed to undo restore')
          }
          return
        }

        const paths = task.data.originalPaths || []
        const infoDir = window.electron.join(homedir, '.local', 'share', 'Trash', 'info')
        const allTrashInfo = await window.electron.readAllTrashInfo(infoDir)
        const items = paths
          .map(p => {
            const found = allTrashInfo.find(i => i.originalPath === p)
            return { trashName: found ? found.trashName : p.split('/').pop() || '', originalPath: p }
          })
          .filter(i => i.trashName)
        const label = 'Move ' + this.taskFileLabel(paths) + ' to trash'
        updateTask(task.id, { status: 'active', name: label, progress: 0, from: '~/.local/share/Trash/files', to: task.data.parentDir || '' })
        window.electron.ipcRenderer.on('trash-restore-progress', (_, { done, total, errors, copiedBytes, totalBytes }) => {
          if(task.status === 'cancelled' || task.status === 'paused') return
          const progress = totalBytes > 0 && copiedBytes != null
            ? Math.round((copiedBytes / totalBytes) * 100)
            : Math.round((done / total) * 100)
          const successCount = done - errors
          updateTask(task.id, {
            progress,
            totalSize: totalBytes || task.totalSize,
            timeRemaining: null,
            status: done >= total ? (errors ? (successCount > 0 ? 'partial' : 'error') : 'done') : 'active'
          })
        })
        try {
          const result = await window.electron.ipcRenderer.invoke('trash-restore-items', items, task.id)
          window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
          if(task.status === 'cancelled'){
            removeTask(task.id)
            await this.refreshDir()
            return
          }
          if(result.errors){
            updateTask(task.id, { status: 'error', name: label, progress: 100 })
            this.showToast('Failed to restore from trash: ' + result.lastError)
          }else{
            updateTask(task.id, { status: 'undone', name: label, progress: 100 })
            const parentDir = task.data.parentDir || ''
            const names = (task.data.originalPaths || []).map(p => p.split('/').pop() || '')
            await this._openLocationAndReveal(parentDir, names)
          }
        } catch(e) {
          window.electron.ipcRenderer.removeAllListeners('trash-restore-progress')
          updateTask(task.id, { status: 'error', name: label, progress: 100 })
          this.showToast('Failed to restore from trash')
        }
      },
      async onTaskOpenFolder(task: Task){
        if(!task.data || !task.data.originalPaths) return
        const op = task.data.operation
        const trashDir = TRASH_PATH
        const infoDir = window.electron.join(homedir, '.local', 'share', 'Trash', 'info')
        const originDir = task.data.originalPaths[0].replace(/\/[^/]+$/, '') || '/'
        const isReverted = task.status === 'undone' || task.status === 'cancelled' || task.status === 'error'

        let targetDir
        let names

        if(op === 'copy' || op === 'move'){
          targetDir = isReverted ? originDir : task.data.destDir
          if(op === 'copy' && !isReverted && task.data.copiedPaths && task.data.copiedPaths.length){
            names = task.data.copiedPaths.map(p => p.split('/').pop())
          }else{
            names = task.data.originalPaths.map(p => p.split('/').pop())
          }
        }else if(op === 'trash'){
          targetDir = isReverted ? (task.data.parentDir || originDir) : trashDir
          if(isReverted){
            names = task.data.originalPaths.map(p => p.split('/').pop())
          }else{
            const allTrashInfo = await window.electron.readAllTrashInfo(infoDir)
            names = task.data.originalPaths
              .map(p => {
                const found = allTrashInfo.find(i => i.originalPath === p)
                return found ? found.trashName : null
              })
              .filter(Boolean)
          }
        }else if(op === 'trash-restore'){
          targetDir = isReverted ? trashDir : (task.data.parentDir || originDir)
          if(isReverted){
            names = (task.data.trashNames || [])
          }else{
            names = task.data.originalPaths.map(p => p.split('/').pop())
          }
        }else if(op === 'trash-delete'){
          targetDir = trashDir
          const allTrashInfo = await window.electron.readAllTrashInfo(infoDir)
          names = task.data.originalPaths
            .map(p => {
              const found = allTrashInfo.find(i => i.originalPath === p)
              return found ? found.trashName : null
            })
            .filter(Boolean)
        }else{
          return
        }

        await this._openLocationAndReveal(targetDir || '', names)
      },
      async _openLocationAndReveal(targetDir: string, names: (string | null | undefined)[] | undefined){
        if(this.currentDir === targetDir){
          await this.refreshDir()
        }else{
          await this.jump(targetDir)
          await this.refreshDir()
        }
        if(names && names.length){
          const next: Record<string, boolean> = {}
          for(const entry of this.entries){
            const entryPath = entry.path || window.electron.join(this.currentDir, entry.name)
            if(names.includes(entry.name)) next[entryPath] = true
          }
          await this._revealFirstSelected(next)
        }
      },
      async _revealFirstSelected(selectedMap: Record<string, boolean>){
        const paths = Object.keys(selectedMap)
        this.selectedMap = selectedMap
        this.previewPath = paths[paths.length - 1] || null
        this.lastClickedPath = this.previewPath
        if(!paths.length) return
        await this.$nextTick()
        const wz = this.$refs.workzone as WorkZoneRef | undefined
        if(wz && wz.scrollToPath) wz.scrollToPath(paths[0])
      },
      flatPathList(): string[] {
        const list: string[] = []
        for(const group of this.groups){
          for(const entry of group.entries){
            list.push(entry.path || window.electron.join(this.currentDir, entry.name))
          }
        }
        return list
      },
      _scrollToKeyPath(path: string){
        this.$nextTick(() => {
          const wz = this.$refs.workzone as WorkZoneRef | undefined
          if(wz && wz.scrollToPath) wz.scrollToPath(path)
        })
      },
      keyMoveSelection(e: KeyboardEvent, jumpToEnd: boolean){
        const list = this.flatPathList()
        if(!list.length) return
        const anchor = this.lastClickedPath && list.includes(this.lastClickedPath) ? this.lastClickedPath : null
        const cursor = this.previewPath && list.includes(this.previewPath) ? this.previewPath : null
        const curIdx = cursor ? list.indexOf(cursor) : (anchor ? list.indexOf(anchor) : 0)
        const wz = this.$refs.workzone as WorkZoneRef | undefined
        const perRow = wz && wz.itemsPerRow ? wz.itemsPerRow : 1
        let delta
        if(jumpToEnd){
          delta = e.key === 'Home' ? -Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
        } else if(e.key === 'ArrowDown'){
          delta = curIdx + perRow < list.length ? perRow : 0
        } else if(e.key === 'ArrowUp'){
          delta = curIdx >= perRow ? -perRow : 0
        } else {
          delta = e.key === 'ArrowRight' ? 1 : -1
        }
        const nextIdx = Math.max(0, Math.min(list.length - 1, curIdx + delta))
        const target = list[nextIdx]
        if(e.shiftKey && anchor){
          const anchorIdx = list.indexOf(anchor)
          const start = Math.min(anchorIdx, nextIdx)
          const end = Math.max(anchorIdx, nextIdx)
          const next: Record<string, boolean> = {}
          for(let i = start; i <= end; i++) next[list[i]] = true
          this.selectedMap = next
          this.previewPath = target
        } else if(e.ctrlKey){
          this.previewPath = target
          this.lastClickedPath = target
        } else {
          this.selectedMap = { [target]: true }
          this.previewPath = target
          this.lastClickedPath = target
        }
        this._scrollToKeyPath(target)
      },
      keyOpenFocused(){
        const list = this.flatPathList()
        const path = this.lastClickedPath || list[0]
        if(!path) return
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries
        const entry = source.find(en => (en.path || window.electron.join(this.currentDir, en.name)) === path)
        if(!entry) return
        if(entry.type === 'directory') this.openDir(path)
        else this.openFile(path)
      },
      keyToggleFocused(){
        const path = this.lastClickedPath
        if(!path) return
        if(this.selectedMap[path]){
          const next = { ...this.selectedMap }
          delete next[path]
          this.selectedMap = next
        } else {
          this.selectedMap = { ...this.selectedMap, [path]: true }
        }
        this.previewPath = path
      },
      keyBack(){
        const tab = this.tabs[this.activeTabIndex]
        if(!tab || tab.historyIndex <= 0) return
        this.isSearchMode = false
        this.searchResults = null
        this.searchVersion++
        tab.historyIndex--
      },
      async showProperties(path: string){
        if(!path) return
        const info: PropsInfo = { name: path.split('/').pop(), location: path }
        let stat = null
        try { stat = await window.electron.stat(path) } catch(e) {}
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries
        const entry = source.find(en => (en.path || window.electron.join(this.currentDir, en.name)) === path)
        const isDir = entry ? entry.type === 'directory' : false
        const typeText = entry
          ? (isDir ? 'Folder' : (entry.filetype || 'File'))
          : (isDir ? 'Folder' : 'File')
        info.typeText = typeText
        const fmtDate = (ms: number) => ms ? new Date(ms).toISOString().replace('T',' ').replace(/:[^:]+$/,'') : ''
        if(stat){
          if(stat.birthtimeMs && stat.birthtimeMs > 0) info.createdText = fmtDate(stat.birthtimeMs)
          info.modifiedText = fmtDate(stat.mtimeMs)
          if(typeof stat.mode === 'number') info.permissionsText = (stat.mode & 0o777).toString(8)
        }
        if(isDir){
          const dirInfo = await window.electron.getDirInfo(path).catch(() => null)
          if(dirInfo){
            info.sizeText = prettyBytes(dirInfo.size)
            info.countText = dirInfo.count + ' item' + (dirInfo.count === 1 ? '' : 's')
          }
        } else if(stat){
          info.sizeText = prettyBytes(stat.size)
        }
        this.propsInfo = info
        this.propsPopupVisible = true
      },
      closeProperties(){
        this.propsPopupVisible = false
        this.propsInfo = {}
      },
      openAbout(){
        this.aboutPopupVisible = true
      },
      closeAbout(){
        this.aboutPopupVisible = false
      },
      openHotkeys(){
        this.hotkeysPopupVisible = true
      },
      closeHotkeys(){
        this.hotkeysPopupVisible = false
      },
      openGithub(){
        window.electron.openExternal('https://github.com/SombraEAX/file-manager')
      },
      openWebsite(){
        window.electron.openExternal('https://sombraeax.github.io/')
      },
      showToast(text: string){
        if(this.toastTimer) clearTimeout(this.toastTimer);
        this.toastText = text;
        this.toastVisible = true;
        this.toastTimer = setTimeout(() => {
          this.toastVisible = false;
          this.toastTimer = null;
        }, 5000);
      },
      getGroup(entry: EntryStats){
        switch(this.groupBy){
          case 'name': return entry.name[Number(entry.name[0] === '.')].toUpperCase()
          case 'modified': return new Date(entry.modified || 0).toISOString().split('T')[0]
          case 'size': {
            const size = entry.size || 0
            if(size < 10 * KB)  return '< 10 KB'
            if(size < 100 * KB) return '10 — 100 KB'
            if(size < MB)       return '100 KB — 1 MB'
            if(size < 10 * MB)  return '1 — 10 MB'
            if(size < 100 * MB) return '10 — 100 MB'
            if(size < GB)       return '100 MB — 1 GB'
            return Math.floor(size/GB) + ' GB'
          }
          case 'type': return entry.filetype
          default: return null
        }
      },
      restoreScroll(){
        if(!this._restoreScrollPending) return;
        this._restoreScrollPending = false;
        const el = (this.$refs.workzone as WorkZoneRef | undefined)?.$el.querySelector('.inner');
        const tab = this.tabs[this.activeTabIndex];
        if(el && tab && tab.scrollTop){
          el.scrollTop = tab.scrollTop;
        }
      },
      async refreshDir(){
        const target = this.currentDir
        if(!target) return
        try {
          let folders = 0
          let files   = 0
          const allEntries = await window.electron.readdir(target)
          if(this.currentDir !== target) return
          this._allEntries = allEntries
          const filtered = this.showHidden ? allEntries : allEntries.filter(e => e.name[0] !== '.')
          for(const entry of filtered){
            if(entry.type === 'directory') folders++
            if(entry.type === 'file')      files++
          }
          this.entries = filtered
          this.folders = folders
          this.files   = files
          this.searchVersion++
        } catch(e) {}
      },

      toggleHtmlMenus(){
        toggleHtmlMenus()
      },

      toggleCustomFrame(){
        this.customFrame = !this.customFrame
        localStorage.setItem('customFrame', String(this.customFrame))
        window.electron.ipcRenderer.send('set-window-frame', this.customFrame)
      },

      toggleWindowMaximize(){
        if(IS_WEB) return
        window.electron.ipcRenderer.send('window-controls-maximize')
      },

      syncCustomFrame(){
        if(IS_WEB) return
        window.electron.ipcRenderer.invoke('get-window-frame')
          .then(v => { this.customFrame = !!v })
          .catch(() => {})
      },

      syncWindowMaximized(){
        if(IS_WEB) return
        window.electron.ipcRenderer.invoke('window-controls-is-maximized')
          .then(v => { this.windowMaximized = !!v })
          .catch(() => {})
        this._onWindowMaximized = (_e: unknown, v: unknown) => { this.windowMaximized = !!v }
        window.electron.ipcRenderer.on('window-maximized-changed', this._onWindowMaximized)
      }
    },
    
    async mounted(){
      window.__tasks = { tasks, createTask, updateTask, cancelTask, removeTask, pauseTask, resumeTask }
      this.syncCustomFrame()
      this.syncWindowMaximized()
      this.tabs.push({ id: ++this.tabIdCounter, history: [], historyIndex: -1, scrollTop: 0 });
      this.activeTabIndex = 0;
      await this.jump(homedir)
      this._onKeydown = (e) => {
        if(e.key === 'Escape' && this.trashPopupVisible) this.cancelMoveToTrash()
        if(e.key === 'Escape' && this.trashActionVisible) this.cancelTrashAction()
        if(e.key === 'Escape' && this.propsPopupVisible) this.closeProperties()
        if(e.key === 'Escape' && this.aboutPopupVisible) this.closeAbout()
        if(e.key === 'Escape' && this.hotkeysPopupVisible) this.closeHotkeys()
        if(e.altKey && (e.key === 'Enter' || e.code === 'NumpadEnter') && !this.renamingPath && document.activeElement?.tagName !== 'INPUT'){
          e.preventDefault()
          this.showProperties(this.lastClickedPath || Object.keys(this.selectedMap)[0])
        }
        if(e.key === 'Delete' && !this.renamingPath && !this.trashPopupVisible && !this.trashActionVisible && document.activeElement?.tagName !== 'INPUT'){
          const paths = Object.keys(this.selectedMap)
          if(paths.length){
            if(this.isTrash) this.beginTrashAction('delete', paths)
            else this.confirmMoveToTrash(paths)
          }
        }
        if(e.ctrlKey && (e.key === 'c' || e.code === 'KeyC') && !this.renamingPath && document.activeElement?.tagName !== 'INPUT'){
          e.preventDefault()
          this.onCopy()
        }
        if(e.ctrlKey && (e.key === 'x' || e.code === 'KeyX') && !this.renamingPath && document.activeElement?.tagName !== 'INPUT'){
          e.preventDefault()
          this.onCut()
        }
        if(e.ctrlKey && (e.key === 'v' || e.code === 'KeyV') && !this.renamingPath && document.activeElement?.tagName !== 'INPUT'){
          e.preventDefault()
          this.onPaste()
        }
        if(this.view === 'icons' && e.ctrlKey && document.activeElement?.tagName !== 'INPUT'){
          if(e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'Equal'){
            e.preventDefault()
            this.iconSize = Math.min(128, (this.iconSize || 120) + 10)
          } else if(e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus'){
            e.preventDefault()
            this.iconSize = Math.max(40, (this.iconSize || 120) - 10)
          } else if(e.key === '0' || e.code === 'Numpad0' || e.code === 'Digit0'){
            e.preventDefault()
            this.iconSize = 120
          }
        }
        if(!this.renamingPath && !this.trashPopupVisible && !this.trashActionVisible && document.activeElement === document.body){
          if(e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
            e.preventDefault()
            this.keyMoveSelection(e, false)
          } else if(e.key === 'Home' || e.key === 'End'){
            e.preventDefault()
            this.keyMoveSelection(e, true)
          } else if(e.key === 'Enter' && !e.altKey){
            e.preventDefault()
            this.keyOpenFocused()
          } else if(e.key === ' '){
            e.preventDefault()
            this.keyToggleFocused()
          } else if(e.key === 'Backspace'){
            e.preventDefault()
            this.keyBack()
          } else if(e.ctrlKey && (e.key === 'a' || e.code === 'KeyA')){
            e.preventDefault()
            this.selectAllEntries()
          }
        }
      }
      document.addEventListener('keydown', this._onKeydown as (e: KeyboardEvent) => void)
      on('task-cancel', this.onTaskCancel)
      on('task-retry', this.onTaskRetry)
      on('task-undo', this.onTaskUndo)
      on('task-open-folder', this.onTaskOpenFolder)
      on('task-pause', this.onTaskPause)
      on('task-resume', this.onTaskResume)
      on('task-retry-failed', this.onTaskRetryFailed)
    },
    beforeUnmount(){
      document.removeEventListener('keydown', this._onKeydown as (e: KeyboardEvent) => void)
      off('task-cancel', this.onTaskCancel)
      off('task-retry', this.onTaskRetry)
      off('task-undo', this.onTaskUndo)
      off('task-open-folder', this.onTaskOpenFolder)
      off('task-pause', this.onTaskPause)
      off('task-resume', this.onTaskResume)
      off('task-retry-failed', this.onTaskRetryFailed)
      if(this._onWindowMaximized){
        window.electron.ipcRenderer.removeListener('window-maximized-changed', this._onWindowMaximized)
        this._onWindowMaximized = null
      }
    },
    
    computed:{
      menuState(){
        return menuState
      },
      titleBarVisible(){
        return this.customFrame && !this.showMenuBar && (this.autohideTopPanel || !(this.windowMaximized && !this.tabsInSidePanel))
      },
      controlsInTabBar(){
        return this.customFrame && !this.showMenuBar && !this.autohideTopPanel && this.windowMaximized && !this.tabsInSidePanel
      },
      groups(){
        const source = this.isSearchMode && this.searchResults ? this.searchResults : this.entries;

        const groups: Group[] = []
        const prop: keyof EntryStats | undefined = ({
          name: 'name',
          size: 'size',
          type: 'filetype',
          modified: 'mtimeMs'
        } as Record<string, keyof EntryStats>)[this.sortColumn]

        for(const entry of source){
          const groupName = this.getGroup(entry)
          let group = groups.find(g => g.name === groupName)
          if(!group) groups.push(group = {name: groupName, entries: []})
          const path = entry.path || window.electron.join(this.currentDir, entry.name)
          entry.selected = !!this.selectedMap[path]
          group.entries.push(entry)
        }
        
        for(const group of groups)
          group.entries = this.sortByProperty(
           group.entries,
           prop,
           this.sortOrder
         )
        return groups
      },
          
          currentDir(): string {
        const tab = this.tabs[this.activeTabIndex];
        return tab ? (tab.history[tab.historyIndex] || '') : '';
      },

      isBookmarked(){
        return !!(this.currentDir && this.bookmarks.includes(this.currentDir))
      },

      propsRows(){
        const info = this.propsInfo
        const rows = []
        if(info.typeText) rows.push({ label: 'Type', value: info.typeText })
        if(info.location) rows.push({ label: 'Location', value: info.location, path: true })
        if(info.sizeText) rows.push({ label: 'Size', value: info.sizeText })
        if(info.countText) rows.push({ label: 'Contains', value: info.countText })
        if(info.modifiedText) rows.push({ label: 'Modified', value: info.modifiedText })
        if(info.createdText) rows.push({ label: 'Created', value: info.createdText })
        if(info.permissionsText) rows.push({ label: 'Permissions', value: info.permissionsText })
        return rows
      },


      searchFiles(){
        return this.searchResults ? this.searchResults.filter(e => e.type === 'file').length : 0;
      },

      searchDirs(){
        return this.searchResults ? this.searchResults.filter(e => e.type === 'directory').length : 0;
      },

      isTrash(){
        return this.currentDir === TRASH_PATH
      },

      hasSelection(){
        return Object.keys(this.selectedMap).length > 0
      },

      canOpenInNewTab(){
        const path = this.focusedPath()
        if(!path) return false
        return this._entryType(path) === 'directory'
      },

      canOpenWith(){
        const path = this.focusedPath()
        if(!path) return false
        return this._entryType(path) === 'file'
      },

      trashSelectedCount(){
        return Object.keys(this.selectedMap).length
      },

      trashDeleteLabel(){
        const n = this.trashSelectedCount
        if(!n) return 'Delete all files'
        return n === 1 ? 'Delete selected file' : 'Delete selected files'
      },

      trashRestoreLabel(){
        const n = this.trashSelectedCount
        if(!n) return 'Restore all files'
        return n === 1 ? 'Restore selected file' : 'Restore selected files'
      },

      hotkeysRows(){
        return [
          { keys: 'Ctrl + C', action: 'Copy selected items' },
          { keys: 'Ctrl + X', action: 'Cut selected items' },
          { keys: 'Ctrl + V', action: 'Paste' },
          { keys: 'Ctrl + A', action: 'Select all items' },
          { keys: 'Delete',   action: 'Move selected items to Trash' },
          { keys: 'Alt + Enter', action: 'Show properties' },
          { keys: 'Enter',    action: 'Open selected item' },
          { keys: 'Space',    action: 'Toggle selection' },
          { keys: 'Backspace', action: 'Go to parent folder' },
          { keys: 'Arrow keys', action: 'Navigate' },
          { keys: 'Home / End', action: 'Jump to first / last item' },
          { keys: 'Ctrl + / - / 0', action: 'Zoom in / out / reset (icons view)' }
        ]
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
          const filtered = val ? this._allEntries : this._allEntries.filter(e => e.name[0] !== '.')
          for(const entry of filtered){
            if(entry.type === 'directory') folders++
            if(entry.type === 'file')      files++
          }
          this.entries = filtered
          this.folders = folders
          this.files   = files
        }
      },
      showMenuBar(val){
        localStorage.setItem('showMenuBar', val)
      },
      tabsInSidePanel(val){
        localStorage.setItem('tabsInSidePanel', val)
      },
      bookmarks: {
        handler(val){
          localStorage.setItem('bookmarks', JSON.stringify(val))
        },
        deep: true
      },

      async currentDir(){
        const target = this.currentDir
        this.isSearchMode = false;
        this.searchResults = null;
        try {
          let folders = 0
          let files   = 0
          const allEntries = await window.electron.readdir(target)
          if(this.currentDir !== target) return
          this._allEntries = allEntries
          const filtered = this.showHidden ? allEntries : allEntries.filter(e => e.name[0] !== '.')
          
          for(const entry of filtered){
            if(entry.type === 'directory') folders++
            if(entry.type === 'file')      files++
          }

          this.entries = filtered
          
          this.folders = folders
          this.files   = files
          this.$nextTick(() => this.restoreScroll());
        } catch(e) {
          if(this.currentDir === target) this.showToast('Folder not found');
        }
      }
    }
  })
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
    font-family:v-bind('theme.font');
  }

  .global-wrapper{
    height:100%;
    max-height:100%;
    display:flex;
    flex-direction:column;
    position:relative;
    font-family: v-bind('theme.font');
    background: v-bind('theme.background');
    color: v-bind('theme.fontColor');
    --title-bar-height:30px;
  }
  .global-wrapper.custom-frame{
    box-sizing:border-box;
    border:1px solid v-bind('theme.borderColor');
    overflow:hidden;
  }
  .tab-bar-row{
    display:flex;
    align-items:stretch;
    flex-shrink:0;
  }
  .tab-bar-row > .tab-bar{
    flex:1 1 auto;
    min-width:0;
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
  .title-bar{
    height:var(--title-bar-height);
    display:flex;
    align-items:stretch;
    justify-content:flex-end;
    -webkit-app-region:drag;
    flex-shrink:0;
    position:relative;
    z-index:360;
    background: v-bind('theme.background');
  }
  .global-wrapper.custom-frame .menu-bar{
    position:relative;
    z-index:360;
    background: v-bind('theme.background');
  }
  .title-bar .window-controls{
    -webkit-app-region:no-drag;
  }
  .title-bar.menu-open{
    -webkit-app-region:no-drag;
  }
  .top-panel-slider.autohide{
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
  .top-panel-slider.autohide .top-panel-inner{
    position:absolute;
    top:0;
    left:0;
    right:0;
    z-index:1;
    background: v-bind('theme.background');
    transform:translateY(-100%);
    transition:transform .15s ease;
    padding-bottom:6px
  }
  .top-panel-slider.autohide.panel-visible .top-panel-inner{
    transform:translateY(0);
    box-shadow:0 2px 8px rgba(0,0,0,.3)
  }
  .global-wrapper.custom-frame .top-panel-slider.autohide .top-panel-inner{
    transform:translateY(calc(-100% - var(--title-bar-height)));
  }
  .global-wrapper.custom-frame .top-panel-slider.autohide.panel-visible .top-panel-inner{
    transform:translateY(0);
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
    background: v-bind('theme.background')
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
  .trash-panel{
    position:absolute;
    bottom:20px;
    left:50%;
    transform:translateX(-50%);
    display:flex;
    gap:16px;
    padding:6px 16px;
    background: v-bind('theme.trashPanel.background');
    color: v-bind('theme.trashPanel.textColor');
    border-radius: v-bind('theme.trashPanel.borderRadius');
    box-shadow: 0 2px 3px v-bind('theme.trashPanel.shadowColor');
    font-family: v-bind('theme.font');
    font-size:13px;
    z-index:500;
  }
  .trash-btn{
    background:none;
    border:none;
    padding:2px 4px;
    font-family: v-bind('theme.font');
    font-size:13px;
    cursor:pointer;
    border-radius:3px;
  }
  .trash-btn.delete{
    color: v-bind('theme.trashPanel.deleteColor');
  }
  .trash-btn.delete:hover{
    color: v-bind('theme.trashPanel.deleteHoverColor');
    text-decoration:underline;
  }
  .trash-btn.restore{
    color: v-bind('theme.trashPanel.restoreColor');
  }
  .trash-btn.restore:hover{
    color: v-bind('theme.trashPanel.restoreHoverColor');
    text-decoration:underline;
  }
  .trash-panel-fade-enter-active, .trash-panel-fade-leave-active{
    transition:opacity .2s, transform .2s;
  }
  .trash-panel-fade-enter-from, .trash-panel-fade-leave-to{
    opacity:0;
    transform:translateX(-50%) translateY(10px);
  }
  .trash-confirm-overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.3);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:10000;
  }
  .trash-confirm-popup{
    background: v-bind('theme.dropDown.background');
    border:1px solid v-bind('theme.dropDown.borderColor');
    border-radius:8px;
    padding:20px 24px;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    min-width:280px;
    max-width:360px;
  }
  .trash-confirm-text{
    font-family:v-bind('theme.font');
    font-size:14px;
    color:v-bind('theme.fontColor');
    margin-bottom:16px;
    line-height:1.4;
  }
  .trash-confirm-actions{
    display:flex;
    justify-content:flex-end;
    gap:8px;
  }
  .trash-confirm-btn{
    font-family:v-bind('theme.font');
    font-size:13px;
    padding:5px 14px;
    border-radius:4px;
    border:1px solid v-bind('theme.dropDown.borderColor');
    cursor:pointer;
  }
  .trash-confirm-btn.cancel{
    background:v-bind('theme.dropDown.background');
    color:v-bind('theme.fontColor');
  }
  .trash-confirm-btn.cancel:hover{
    background:v-bind('theme.dropDown.itemHoverBackground');
  }
  .trash-confirm-btn.confirm{
    background:#cc0000;
    color:#fff;
    border-color:#990000;
  }
  .trash-confirm-btn.confirm:hover{
    background:#990000;
  }
  .props-popup{
    background: v-bind('theme.dropDown.background');
    border:1px solid v-bind('theme.dropDown.borderColor');
    border-radius:8px;
    padding:20px 24px;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    min-width:360px;
    max-width:460px;
  }
  .props-title{
    font-family:v-bind('theme.font');
    font-size:16px;
    font-weight:bold;
    color:v-bind('theme.fontColor');
    margin-bottom:16px;
    word-break:break-all;
  }
  .props-body{
    margin-bottom:16px;
  }
  .props-row{
    display:flex;
    gap:16px;
    padding:4px 0;
    font-family:v-bind('theme.font');
    font-size:13px;
    color:v-bind('theme.fontColor');
  }
  .props-label{
    flex:0 0 100px;
    color:v-bind('theme.dropDown.textColor');
    opacity:0.7;
  }
  .props-value{
    flex:1;
    word-break:break-all;
  }
  .props-close{
    background:#4a90d9;
    border-color:#3a7cc0;
  }
  .props-close:hover{
    background:#3a7cc0;
  }
  .about-popup{
    background: v-bind('theme.dropDown.background');
    border:1px solid v-bind('theme.dropDown.borderColor');
    border-radius:8px;
    overflow:hidden;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    min-width:380px;
    max-width:480px;
  }
  .about-header{
    display:block;
    width:100%;
    height:180px;
    object-fit:cover;
  }
  .about-title{
    font-family:v-bind('theme.font');
    font-size:18px;
    font-weight:bold;
    color:v-bind('theme.fontColor');
    text-align:center;
    margin:14px 24px 4px;
  }
  .about-body{
    padding:10px 24px 16px;
  }
  .about-row{
    display:flex;
    gap:8px;
    padding:4px 0;
    font-family:v-bind('theme.font');
    font-size:13px;
    color:v-bind('theme.fontColor');
  }
  .about-label{
    flex:0 0 90px;
    color:v-bind('theme.dropDown.textColor');
    opacity:0.7;
  }
  .about-value{
    flex:1;
    word-break:break-all;
  }
  .about-link{
    color:#4a90d9;
    cursor:pointer;
  }
  .about-link:hover{
    text-decoration:underline;
  }
  .about-popup .trash-confirm-actions{
    padding:0 24px 16px;
  }
  .hotkeys-popup{
    background: v-bind('theme.dropDown.background');
    border:1px solid v-bind('theme.dropDown.borderColor');
    border-radius:8px;
    padding:20px 24px;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    min-width:360px;
    max-width:480px;
    max-height:80vh;
    overflow-y:auto;
  }
  .hotkeys-body{
    margin-bottom:16px;
  }
  .hotkey-row{
    display:flex;
    gap:16px;
    padding:4px 0;
    font-family:v-bind('theme.font');
    font-size:13px;
    color:v-bind('theme.fontColor');
  }
  .hotkey-keys{
    flex:0 0 130px;
    color:#4a90d9;
    white-space:nowrap;
  }
  .hotkey-action{
    flex:1;
  }
  .trash-popup-fade-enter-active, .trash-popup-fade-leave-active{
    transition:opacity .15s;
  }
  .trash-popup-fade-enter-from, .trash-popup-fade-leave-to{
    opacity:0;
  }
</style>
