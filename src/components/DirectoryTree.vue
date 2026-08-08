<template>
  <side-bar
    @resize="(ev) => $emit('resize',ev)"
    :width="width"
    :minWidth="150"
    position="left"
  >
    <div class="tree-wrap">
      <div class="outer scrollbox">
        <div class="inner">
          <div class="section" v-for="section in sections" :key="section.title">
            <div class="section-title">{{ section.title }}</div>
            <directory-list
              :dirs="section.dirs"
              :selected="selected"
              menuable
              @select="(ev) => $emit('select', ev)"
              @dir-context="onDirContextMenu"
            />
          </div>
          <div class="section" v-if="bookmarks.length">
            <div class="section-title">Bookmarks</div>
            <directory-list
              :dirs="bookmarkDirs"
              :selected="selected"
              closable
              menuable
              @select="(ev) => $emit('select', ev)"
              @close="$emit('remove-bookmark', $event)"
              @dir-context="onDirContextMenu"
            />
          </div>
          <div class="section" v-if="tabsInSidePanel && tabs.length > 1">
            <div class="section-title">Tabs</div>
            <directory-list
              :dirs="tabsDirs"
              :selected="activeTabPath"
              closable
              @select="onTabSelect"
              @close="onTabClose"
            />
          </div>
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
<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import type { Tab, Section, DirItem, DirContextMenuEvent } from '../types/domains'
  import type { MenuItemSpec } from '../types/ipc'
  import { openMenu } from '../stores/menus'
  import theme from '../../theme.json'
  import DirectoryList from './DirectoryList.vue'
  import SideBar from './SideBar.vue'

  const homedir = `/home/${window.electron.getUserName()}`
  const username = window.electron.getUserName()

  export default defineComponent({
    emits: ['select', 'resize', 'select-tab', 'close-tab', 'remove-bookmark', 'open-in-new-tab'],
    props: {
      width: Number,
      selected: String,
      items: Number,
      files: Number,
      dirsCount: Number,
      tabs: { type: Array as PropType<Tab[]>, default: () => [] },
      activeTabIndex: Number,
      tabsInSidePanel: Boolean,
      bookmarks: {
        type: Array as PropType<string[]>,
        default: () => []
      }
    },
    components: { DirectoryList, SideBar },
    data(){
      const places: DirItem[] = [
        { name: 'home', pathname: homedir, caption: username },
        { name: 'Desktop', pathname: window.electron.join(homedir, 'Desktop') },
        { name: 'Documents', pathname: window.electron.join(homedir, 'Documents') },
        { name: 'Downloads', pathname: window.electron.join(homedir, 'Downloads') },
        { name: 'Music', pathname: window.electron.join(homedir, 'Music') },
        { name: 'Pictures', pathname: window.electron.join(homedir, 'Pictures') },
        { name: 'Public', pathname: window.electron.join(homedir, 'Public') },
        { name: 'Videos', pathname: window.electron.join(homedir, 'Videos') },
        { name: 'Trash', pathname: 'trash://', caption: 'Trash' },
        { name: '/', pathname: '/', caption: 'System root' }
      ]
      const sections: Section[] = [
        { title: 'PLACES', dirs: places }
      ]
      return {
        theme,
        sections
      }
    },
    computed: {
      bookmarkDirs(): DirItem[] {
        return this.bookmarks.map(pathname => ({
          name: this.pathName(pathname),
          pathname
        }))
      },
      tabsDirs(): DirItem[] {
        return this.tabs.map((tab, i) => ({
          name: this.tabTitle(tab),
          pathname: '#tab-' + i
        }))
      },
      activeTabPath(){
        return '#tab-' + this.activeTabIndex
      }
    },
    methods: {
      pathName(pathname: string): string {
        if(pathname === 'trash://') return 'Trash'
        if(!pathname) return ''
        if(pathname === '/') return '/'
        return pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || '/'
      },
      tabTitle(tab: Tab): string {
        const path = tab.history[tab.historyIndex]
        if (!path || path === '/') return '/'
        return path.split('/').filter(Boolean).pop() || '/'
      },
      onTabSelect(pathname: string){
        const m = String(pathname).match(/^#tab-(\d+)$/)
        if (m) this.$emit('select-tab', parseInt(m[1], 10))
      },
      onDirContextMenu({ pathname, x, y }: DirContextMenuEvent){
        const items: MenuItemSpec[] = [{ label: 'Open' }, { label: 'Open in new tab' }]
        openMenu(items, x, y).then(index => {
          if(index === 0) this.$emit('select', pathname)
          else if(index === 1) this.$emit('open-in-new-tab', pathname)
        })
      },
      onTabClose(pathname: string){
        const m = String(pathname).match(/^#tab-(\d+)$/)
        if (m) this.$emit('close-tab', parseInt(m[1], 10))
      }
    }
  })
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
  .section-title{
    text-transform:uppercase;
    color:v-bind('theme.sidebarSectionTitleColor');
    font-size:12px;
    font-weight:bold;
    font-family:sans-serif;
    padding:8px 0 4px
  }
</style>
