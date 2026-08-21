<template>
  <div class="outer" @click.stop>
    <div class="inner">
      <div class="row first" :data-editing="isEditing" :data-search="isExecutingSearch" :data-results="isSearchResults" @click="onRowClick" :class="{ shadow: dropdownScrolled }">
        <div v-if="isExecutingSearch" class="search-mode-bar">
          <span class="search-mode-icon"></span>
          <span class="search-mode-text" v-if="!isSearchResults">Search «{{ searchQuery }}» in {{ selectedLocation }}</span>
          <span class="search-mode-text" v-if="isSearchResults">Search results for «{{ searchQuery }}»</span>
          <div v-if="!isSearchResults" class="search-progress"></div>
        </div>
        <template v-if="!isEditing && !isExecutingSearch">
          <span class="breadcrumb-root" @click.stop="goToRoot">
            <EntryIcon :size="16" is-dir :type="currentFolderType" />
          </span>
          <BreadCrumbs
            class="breadcrumbs-component"
            :address="breadcrumbAddress"
            :activeDelimiter="activeDelimiterForBreadcrumbs"
            @segmentClick="onBreadCrumbSegmentClick"
            @delimiterClick="onBreadCrumbDelimiterClick"
            @ellipsisClick="onBreadCrumbEllipsisClick"
          />
        </template>

        <input
          v-if="isEditing"
          class="address"
          @keydown.enter.stop="gotopath"
          @keydown.esc="finishEditing"
          v-model="tmp"
          ref="addressInput"
        />

        <button
          class="button"
          v-if="isEditing && !compact"
          :disabled="!hasClipboardText"
          @click.stop="pasteAndGo"
        >
          Paste and go
        </button>

        <button
          class="button copy-path"
          v-if="isEditing && !compact"
          @click="copyPath"
          title="Copy path"
        ></button>      

        <button
          :data-search="isSearch"
          class="go"
          v-if="isEditing"
          @click.stop="gotopath"
        >
        </button>

        <button
          class="bookmark-star"
          ref="starBtn"
          :class="{ filled: isBookmarked }"
          v-if="!isEditing && !isExecutingSearch && !menuBarCompact"
          @click.stop="$emit('toggleBookmark')"
          :title="isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'"
        ></button>
      </div>

      <div class="items-outer editing-dropdown" v-if="isEditing && !isSearch">
      <div class="items-inner">
      <div class="items">
        <div class="row item" v-for="dir in dirItems" :key="dir" @click.stop="dirItemClick(dir)">
          <EntryIcon :size="16" is-dir :type="folderType(dir)" />
          <div class="label">{{dir}}</div>
        </div>
      </div>
      </div>
      </div>

      <div class="items-outer" v-if="isEditing && isSearch" data-search="true">
      <div class="items-inner">
      <div class="items">
        <div class="row form-row">
          <div class="label">Search in:</div>
          <div class="field">
            <drop-down :options="searchOptions" v-model="selectedSearchOption" />
          </div>
        </div>
        <div class="row form-row">
          <div class="label">Location:</div>
          <div class="field">
            <drop-down :options="locationOptions" v-model="selectedLocation" :editable="true"/>
          </div>
        </div>
        <div class="row form-row">
          <div class="label">Filetypes:</div>
          <div class="field">
            <drop-down :options="filetypesOptions" v-model="selectedFiletypes" :multipleSelect="true"/>
          </div>
        </div>
        <div class="row form-row">
          <div class="checkbox-group" @click.stop="includeHidden = !includeHidden">
            <span class="checkbox-wrap"><app-checkbox :model-value="includeHidden" /></span>
            <div class="label">Include hidden files</div>
          </div>
          <div class="checkbox-group" @click.stop="includeRegExp = !includeRegExp">
            <span class="checkbox-wrap"><app-checkbox :model-value="includeRegExp" /></span>
            <div class="label">RegExp</div>
          </div>
        </div>
      </div>
      </div>
      </div>

      <div class="items-outer breadcrumb-dropdown" v-if="!isEditing && (openDropdownIdx !== null || openEllipsis)">
      <div class="items-inner" @scroll="onDropdownScroll">
      <div class="items">
        <div
          v-for="dir in dropdownItems"
          :key="dir"
          class="row item"
          @click.stop="dropdownNavigate(dir)"
        >
          <EntryIcon :size="16" is-dir :type="folderType(dir)" />
          <div class="label">{{ dir }}</div>
        </div>
      </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { EntryStats } from '../types/ipc'
import { theme } from '../stores/theme';
import DropDown from './DropDown.vue';
import AppCheckbox from './AppCheckbox.vue';
import EntryIcon from './EntryIcon.vue';
import BreadCrumbs from './BreadCrumbs.vue';
import { getXdgTypeByBasename } from '../xdg';
const homedir = `/home/${window.electron.getUserName()}`

export default defineComponent({
  components: { DropDown, AppCheckbox, EntryIcon, BreadCrumbs },
  props: {
    address: String,
    searchVersion: Number,
    compact: Boolean,
    menuBarCompact: Boolean,
    bookmarks: {
      type: Array,
      default: () => []
    },
    isBookmarked: Boolean
  },
  data() {
    return {
      tmp: this.address || '',
      focused:false,
      theme,

      searchOptions: ['Filenames', 'Content', 'Filenames and content'],
      filetypesOptions: ['Documents', 'Code', 'Images', 'Video', 'Audio'],
      isEditing: false,
      openDropdownIdx: null as number | null,
      openDropdownPath: null as string | null,
      dropdownItems: [] as string[],
      dropdownPaths: [] as string[],
      openEllipsis: false,
      hasClipboardText: false,
    selectedSearchOption: 'Filenames',
    selectedLocation: this.address || homedir,
    browseInProgress: false,
      selectedFiletypes: [] as string[],
      includeHidden: false,
      includeRegExp: false,
      searchQuery: '',
      isExecutingSearch: false,
      isSearchResults: false,
      searchHadResults: false,
      searchTimer: null as ReturnType<typeof setTimeout> | null,
      dropdownScrolled: false,
      wasSearchMode: false,
      searchId: '',
      searchResultsAcc: [] as EntryStats[],
      _dirItems: [] as string[]
    };
  },
  computed: {
    activeDelimiterForBreadcrumbs() {
      return this.openDropdownIdx
    },
    dropdownBasePath(): string {
      const p = (this.openDropdownPath || '/').replace(/\/+$/, '')
      return p === '' ? '/' : p
    },
    locationOptions(){
      return [
        { label: 'Current directory', value: this.address },
        { label: 'Root directory', value: '/' },
        { label: 'Home directory', value: homedir },
        { label: 'Browse...', value: '__browse__' }
      ];
    },
    isSearch(){
      const text = this.tmp.trim()
      if(!text) return false
      return text[0] !== '/' && !text.includes('://')
    },
    isTrash(){
      return this.address === 'trash://'
    },
    breadcrumbAddress() {
      return this.isTrash ? 'Trash' : this.address
    },
    dirItems() {
      return this._dirItems
    },
    currentFolderType() {
      if (this.isTrash) return 'trash'
      if (this.address === '/') return 'root'
      if (!this.address || this.address === homedir) return 'home'
      const name = this.address.split('/').filter(Boolean).pop()
      return name && this.folderType(name) || ''
    }
  },
  methods: {
    onRowClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('.label') || target.closest('.triangle-wrap') || target.closest('.breadcrumb-root')) return
      this.enableEdit()
    },
    onBreadCrumbSegmentClick(path: string) {
      this.closeDropdown();
      if(this.isTrash){
        this.tmp = 'trash://';
        this.$emit('jump', 'trash://');
        return;
      }
      const cleanPath = path.replace(/\/$/, '') || '/'
      this.tmp = cleanPath
      this.$emit('jump', cleanPath)
    },
    onBreadCrumbDelimiterClick({ path, index }: { path: string, index: number }) {
      this.toggleDropdown(path || '/', index)
    },
    onBreadCrumbEllipsisClick(collapsedSegments: {caption: string, path?: string}[]) {
      this.dropdownScrolled = false;
      if (this.openEllipsis) {
        this.closeDropdown();
        return;
      }
      this.openDropdownIdx = null;
      this.openDropdownPath = null;
      this.openEllipsis = true;
      this.dropdownItems = collapsedSegments.map(e => e.caption);
      this.dropdownPaths = collapsedSegments.map(e => e.path || '');
      document.addEventListener('click', this.dropdownOutsideHandler);
    },
    folderType(name: string): string {
      const nameMap: Record<string, string> = {
        'home': 'home', 'desktop': 'desktop', 'documents': 'documents',
        'downloads': 'downloads', 'music': 'music', 'pictures': 'pictures',
        'videos': 'videos', 'trash': 'trash', 'public': 'public',
        'npm': 'npm', 'node_modules': 'npm',
      }
        const type = nameMap[name.toLowerCase()]
        if (type) return type
        return getXdgTypeByBasename(name) || ''
    },
    dirItemClick(dir: string) {
      this.tmp = window.electron.join(this.address || '', dir);
      this.gotopath();
    },
    copyPath(){
      window.electron.ipcRenderer.send('copy-to-clipboard', this.address || '')
    },
    pasteAndGo(){
      this.tmp = window.electron.clipboard.readText();
      this.gotopath();
    },
    onDropdownScroll(e: Event) {
      this.dropdownScrolled = (e.target as HTMLElement).scrollTop > 0;
    },
    focus() {
      (this.$refs.addressInput as HTMLInputElement | undefined)?.select();
    },
    blur() {
      (this.$refs.addressInput as HTMLInputElement | undefined)?.blur();
    },
    enableEdit() {
      this.dropdownScrolled = false;
      this.closeDropdown();
      if(this.searchTimer){
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
      if(this.isExecutingSearch){
        this.tmp = this.searchQuery;
        this.wasSearchMode = true;
        this.searchHadResults = this.isSearchResults;
        this.isExecutingSearch = false;
        this.isSearchResults = false;
      }else{
        this.wasSearchMode = false;
      }
      this.isEditing = true;
      this.hasClipboardText = !!(window.electron.clipboard.readText());
      document.addEventListener('click', this.clickOutsideHandler);
      this.$nextTick(() => {
        this.focus(); 
      });
    },
    finishEditing() {
      document.removeEventListener('click', this.clickOutsideHandler);
      if(this.wasSearchMode){
        this.isExecutingSearch = true;
        this.isSearchResults = this.searchHadResults;
      }else{
        this.tmp = this.address || '';
      }
      this.isEditing = false;
    },
    clickOutsideHandler() {
      this.finishEditing();
      this.closeDropdown();
    },
    goToRoot() {
      this.closeDropdown();
      if(this.isTrash){
        this.tmp = "trash://";
        this.$emit("jump", "trash://");
        return;
      }
      this.tmp = "/";
      this.$emit("jump", "/");
    },
    async toggleDropdown(basePath: string, highlightIdx: number | null) {
      this.dropdownScrolled = false;
      this.openEllipsis = false;
      if (this.openDropdownPath === basePath) {
        this.closeDropdown();
        return;
      }
      this.openDropdownPath = basePath;
      this.openDropdownIdx = highlightIdx;
      try {
        const items = await window.electron.readdir(this.dropdownBasePath)
        this.dropdownItems = items.filter(item => item.type === 'directory').map(item => item.name)
      } catch(e) {
        this.dropdownItems = []
      }
      document.addEventListener('click', this.dropdownOutsideHandler);
    },
    dropdownOutsideHandler() {
      this.closeDropdown();
    },
    dropdownNavigate(dir: string) {
      let path: string;
      if (this.openEllipsis) {
        const idx = this.dropdownItems.indexOf(dir);
        path = this.dropdownPaths[idx] || dir;
      } else {
        path = window.electron.join(this.dropdownBasePath, dir);
      }
      this.closeDropdown();
      this.tmp = path;
      this.$emit("jump", path);
    },
    closeDropdown() {
      document.removeEventListener('click', this.dropdownOutsideHandler);
      this.openDropdownIdx = null;
      this.openDropdownPath = null;
      this.openEllipsis = false;
      this.dropdownItems = [];
      this.dropdownPaths = [];
      this.dropdownScrolled = false;
    },
    onSearchMessage(e: MessageEvent){
      const data = e.data as { type: string; id: string; batch?: EntryStats[]; done?: boolean }
      if(data.type === '__search_batch' && data.id === this.searchId){
        this.searchResultsAcc = this.searchResultsAcc.concat(data.batch || []);
        if(data.done) this.isSearchResults = true;
        this.$emit('search', {
          query: this.searchQuery,
          results: [...this.searchResultsAcc],
          searchIn: this.selectedSearchOption,
          location: this.selectedLocation
        });
      }
    },
    onSearchEsc(e: KeyboardEvent){
      if(e.key === 'Escape' && this.isExecutingSearch){
        if(this.searchId) window.electron.cancelSearch(this.searchId);
        this.searchId = '';
        this.isSearchResults = true;
        this.$emit('search', { query: this.searchQuery, results: [...this.searchResultsAcc] });
      }
    },
    cancelSearch(){
      if(this.searchId) window.electron.cancelSearch(this.searchId);
      this.searchId = '';
      this.isExecutingSearch = false;
      this.isSearchResults = false;
      this.wasSearchMode = false;
      this.$emit('search', { query: '', results: null });
    },
    gotopath() {
      if(this.isSearch){
        this.searchQuery = this.tmp.trim();
        this.isExecutingSearch = true;
        this.isSearchResults = false;
        this.finishEditing();
        this.searchResultsAcc = [];
        const ft = this.selectedFiletypes;
        this.searchId = window.electron.startSearch({
          query: '' + this.searchQuery,
          location: '' + this.selectedLocation,
          searchIn: '' + this.selectedSearchOption,
          filetypes: ft ? Array.from(ft) : [],
          includeHidden: !!this.includeHidden,
          useRegex: !!this.includeRegExp
        });
        return;
      }
      let pathname = this.tmp;
      if (pathname !== "/" && pathname !== "trash://") pathname = pathname.replace(/\/$/, "");
      this.$emit("jump", pathname);
      this.finishEditing(); 
    }
  },
    mounted(){
      window.addEventListener('message', this.onSearchMessage);
      document.addEventListener('keydown', this.onSearchEsc);
    },
    beforeUnmount(){
      window.removeEventListener('message', this.onSearchMessage);
      document.removeEventListener('keydown', this.onSearchEsc);
    },
    watch: {
    async address(newAddress: string | undefined) {
      this.tmp = newAddress || '';
      this.selectedLocation = newAddress || '';
      if(this.isExecutingSearch){
        this.cancelSearch();
      }
      if(newAddress === 'trash://'){
        this._dirItems = []
        return
      }
      try {
        const items = await window.electron.readdir(newAddress || '')
        this._dirItems = items.filter(item => item.type === 'directory').map(item => item.name)
      } catch(e) {
        this._dirItems = []
      }
    },
    searchVersion(){
      if(this.isExecutingSearch){
        this.cancelSearch();
      }
    },
    async selectedLocation(val: string | null) {
      if(val !== '__browse__' || this.browseInProgress) return;
      this.browseInProgress = true;
      const dir = await window.electron.ipcRenderer.invoke('open-directory-dialog');
      if(dir){
        this.selectedLocation = dir;
      }else{
        this.selectedLocation = this.address || '';
      }
      this.browseInProgress = false;
    }
  }
});
</script>

<style scoped>
  .outer{
    flex:1;
    position:relative;
    height:30px;
    margin-right: 7px !important;
    padding-left: 5px !important;
  }
  .inner{
    font-family:v-bind('theme.font');
    width:100%;
    z-index:1000;
  	position:absolute;
  	min-height:30px;
  	display:flex;
  	flex-direction:column;
    border: 0px;
    border-radius: v-bind('theme.addressBar.borderRadius');
    background: v-bind('theme.addressBar.background');
    color: v-bind('theme.addressBar.textColor');
  }
  .row{
    height:30px;
    width:100%
  }
  .items{
    width:100%;
  	display:flex;
  	flex-direction:column
  }
  .first{
    cursor:text;
    box-sizing:border-box;
    border-radius: v-bind('theme.addressBar.borderRadius');
    display:flex;
    align-items:center;
    flex-wrap:nowrap;
    overflow:hidden;
  }
  .first[data-editing="true"]{
    border: 2px solid v-bind('theme.textBoxesBorderColorActive');	    
  }
  .first[data-search="true"]{
    background:v-bind('theme.searchMode.background');
    color:v-bind('theme.searchMode.textColor');
    cursor:text;
    overflow:hidden;
    position:relative
  }
  .first[data-results="true"]{
    background:v-bind('theme.addressBar.background');
    color:v-bind('theme.addressBar.textColor')
  }
  .first.shadow{
    box-shadow: 0 2px 3px v-bind('theme.addressBar.shadowColor');
    position:relative;
    z-index:1;
    border-radius: v-bind('theme.addressBar.borderRadius') v-bind('theme.addressBar.borderRadius') 0 0
  }
  
  .search-mode-bar{
    display:flex;
    align-items:center;
    width:100%;
    height:100%;
    z-index:1;
    position:relative
  }
  .search-mode-icon{
    width:16px;
    height:16px;
    margin:0 5px;
    flex-shrink:0;
    display:inline-flex;
    align-items:center;
    justify-content:center
  }
  .search-mode-icon::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f002";
    font-size:14px
  }
  .search-mode-text{
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    font-size:14px
  }
  .search-progress{
    position:absolute;
    bottom:0;
    left:0;
    right:0;
    height:3px;
    background:v-bind('theme.searchMode.progressTrack');
    overflow:hidden
  }
  .search-progress::after{
    content:'';
    position:absolute;
    top:0;
    left:-40%;
    width:40%;
    height:100%;
    background:v-bind('theme.searchMode.progressColor');
    animation:searchProgress 1.5s ease-in-out infinite
  }
  @keyframes searchProgress{
    0%{left:-40%}
    100%{left:100%}
  }
  
  .breadcrumb-root {
    cursor: pointer;
    padding: 0 0 0 7px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .breadcrumb-root:hover {
    filter: brightness(1.08);
  }

  .breadcrumbs-component {
    flex: 1;
    min-width: 0;
  }

  input {
    border:0px;
    background:transparent;
    color:v-bind('theme.addressBar.textColor');
    flex:1;
    outline:none;
    min-width:0;
  }
  
  .button{
    border:0px;
    background: v-bind('theme.addressBar.inlineButton.normal.background');
    border-radius: v-bind('theme.addressBar.inlineButton.borderRadius');
    color: v-bind('theme.addressBar.inlineButton.normal.textColor');
    margin:auto;
    margin-right:5px;
    height:20px;
    flex-shrink:0;
    white-space:nowrap;
  }

  .button[disabled]{
    background: v-bind('theme.addressBar.inlineButton.disabled.background');
    color:      v-bind('theme.addressBar.inlineButton.disabled.textColor');  	
  }
  
  .copy-path{
    width:20px;
    padding:0;
    display:inline-flex;
    align-items:center;
    justify-content:center;
  }
  .copy-path::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f0c5";
    font-size:14px;
    line-height:1;
  }
  
  .button:not([disabled]){
    background: v-bind('theme.addressBar.inlineButton.normal.background');
    color:      v-bind('theme.addressBar.inlineButton.normal.textColor');
    cursor:pointer;
  }
  

  .button:not([disabled]):hover{
    background: v-bind('theme.addressBar.inlineButton.hover.background');
    color:      v-bind('theme.addressBar.inlineButton.hover.textColor');  	
  }
  .icon{
    width:16px;
    height:16px;
    margin:auto 0 auto 7px;
    flex-shrink:0;
    display:inline-flex;
    align-items:center;
    justify-content:center
  }
  .icon::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f07b";
    font-size:14px
  }  
  .label{
    margin:auto 0;
    width:100%
  }
  .row{
    display:flex;
    gap:5px
  }
  .item:last-child{
    border-bottom-right-radius: v-bind('theme.addressBar.borderRadius');
    border-bottom-left-radius:  v-bind('theme.addressBar.borderRadius');
  }
  .item{
    cursor:pointer;
    padding:0 5px 0 7px;
    box-sizing:border-box
  }
  .item:not(.form-row):hover{
    background: v-bind('theme.addressBar.activeItem.background');  	
    color: v-bind('theme.addressBar.activeItem.textColor');  	
  }
  .go{
    margin:auto;
    width:20px;
    height:20px;
    border:0px;
    background-color:transparent;
    color:v-bind('theme.addressBar.textColor');
    margin-right:5px;    
    cursor:pointer;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
  }
  .go::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f054";
    font-size:16px
  }
  .go[data-search="true"]::before{
    content:"\f002"
  }
  .go:hover{
    filter: hue-rotate(90deg);
  }
  .bookmark-star{
    margin:0 5px 0 auto;
    width:20px;
    height:20px;
    border:0px;
    background-color:transparent;
    cursor:pointer;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
    color:v-bind('theme.bookmarkColor');
  }
  .bookmark-star::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    content:"\f006";
    font-size:16px;
    line-height:1
  }
  .bookmark-star.filled::before{
    content:"\f005"
  }
  .bookmark-star:hover{
    color:v-bind('theme.topPanelIconHoverColor')
  }
  .form-row{
    display:flex;
    flex-direction:row
  }
  .form-row .label{
    margin:auto;
    margin-left:5px;
    flex:2
  }
  .checkbox-group{
    display:flex;
    align-items:center;
    cursor:pointer;
    margin-right:16px
  }
  .checkbox-group .label{
    flex:0;
    white-space:nowrap;
    margin-left:3px
  }
  .form-row .field{
    margin:auto;
    margin-right:5px;
    flex:1;
    height:20px  	
  }
  .checkbox-wrap{
  	margin:auto;
  	flex:0;
  	margin-left:5px;
  	display:flex;
  	align-items:center
  }
  .items-outer.breadcrumb-dropdown{
    max-height:250px;
    height:auto;
  }
  .items-outer.breadcrumb-dropdown .items-inner{
    position:relative;
    height:auto;
    max-height:250px;
    overflow-y:auto;
  }
  .items-outer.editing-dropdown{
    max-height:200px;
    height:auto;
  }
  .items-outer.editing-dropdown .items-inner{
    position:relative;
    height:auto;
    max-height:200px;
    overflow-y:auto;
  }
  .items-outer[data-search="true"]{
    height:auto;
  }
  .items-outer[data-search="true"] .items-inner{
    position:relative;
    height:auto;
    overflow:visible;
  }
  .items-outer{
    width:100%;
    position:relative
  }
  .items-inner{
  	position:absolute;
  	width:100%;
  	height:100%;
  	overflow-y:auto
  }
</style>
