<template>
  <div
    class="menu-bar"
    :class="{ drag: customFrame && !menuState.open }"
    v-if="items.length"
    @dblclick="onDblClick"
  >
    <div
      class="menu-item"
      v-for="item in items"
      :key="item.label"
      @click="openMenu(item, $event)"
    >
      {{ item.label }}
    </div>
    <window-controls v-if="customFrame && !IS_WEB" />
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import type { MenuItemSpec } from '../types/ipc'
  import { openMenuBarSubmenu, menuState } from '../stores/menus'
  import { theme, themeState } from '../stores/theme'
  import { IS_WEB } from '../web'
  import WindowControls from './WindowControls.vue'

  export default defineComponent({
    name: 'MenuBar',

    components: { WindowControls },

    props: {
      view:       String,
      sortColumn: String,
      sortOrder:  String,
      groupBy: { type: [String, null], default: null },
      isDev:      Boolean,
      autohideLeftPanel: Boolean,
      autohideTopPanel: Boolean,
      showHidden: Boolean,
      showMenuBar: Boolean,
      tabsInSidePanel: Boolean,
      hasSelection: Boolean,
      useHtmlMenus: Boolean,
      customFrame: Boolean
    },

    emits: [
      'changeView', 
      'changeSortColumn', 
      'changeSortOrder',
      'changeGroup',
      'toggleAutohideLeftPanel',
      'toggleAutohideTopPanel',
      'toggleShowHidden',
      'toggleShowMenuBar',
      'toggleTabsInSidePanel',
      'toggleHtmlMenus',
      'toggleCustomFrame',
      'changeTheme',
      'selectAll',
      'invertSelection',
      'rename',
      'moveToTrash',
      'copy',
      'cut',
      'paste',
      'createFile',
      'createFolder',
      'open',
      'openInNewTab',
      'properties',
      'about',
      'github',
      'hotkeys'
    ],

    data(){
      return { theme, IS_WEB }
    },

    methods: {
      openMenu(menuItem: MenuItemSpec, event: MouseEvent){
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
        const items = menuItem.submenu || []
        openMenuBarSubmenu(items, rect.x, rect.y + rect.height).then(id => {
          if (id) this.itemClick(id)
        })
      },

      openRootMenu(x: number, y: number){
        openMenuBarSubmenu(this.items, x, y).then(id => {
          if (id) this.itemClick(id)
        })
      },

      onDblClick(event: MouseEvent){
        if(!this.customFrame || IS_WEB) return
        const target = event.target as HTMLElement | null
        if(target && target.closest('.menu-item')) return
        window.electron.ipcRenderer.send('window-controls-maximize')
      },

      itemClick(id: string){
        switch(id){
          case 'icons':
          case 'table':
          case 'list': {
            this.$emit('changeView', id)
            break
          }
          case 'sort-by-name':
          case 'sort-by-type':
          case 'sort-by-modified':
          case 'sort-by-size': {
            const field = id.split('-')[2]
            this.$emit('changeSortColumn', field)
            break
          }
          case 'asc':
          case 'desc': {
            this.$emit('changeSortOrder', id)          
            break
          }
          case 'group-by-name':
          case 'group-by-type':
          case 'group-by-modified':
          case 'group-by-size': {
            const field = id.split('-')[2]
            this.$emit('changeGroup', field)          
            break
          }
          case 'no-group': {
            this.$emit('changeGroup', null)          
            break
          }
          case 'autohide-left-panel': {
            this.$emit('toggleAutohideLeftPanel')
            break
          }
          case 'autohide-top-panel': {
            this.$emit('toggleAutohideTopPanel')
            break
          }
          case 'show-hidden': {
            this.$emit('toggleShowHidden')
            break
          }
          case 'show-menu-bar': {
            this.$emit('toggleShowMenuBar')
            break
          }
          case 'tabs-in-side-panel': {
            this.$emit('toggleTabsInSidePanel')
            break
          }
          case 'html-menus': {
            this.$emit('toggleHtmlMenus')
            break
          }
          case 'custom-frame': {
            this.$emit('toggleCustomFrame')
            break
          }
          case 'select-all': {
            this.$emit('selectAll')
            break
          }
          case 'invert-selection': {
            this.$emit('invertSelection')
            break
          }
          case 'rename': {
            this.$emit('rename')
            break
          }
          case 'move-to-trash': {
            this.$emit('moveToTrash')
            break
          }
          case 'copy': {
            this.$emit('copy')
            break
          }
          case 'cut': {
            this.$emit('cut')
            break
          }
          case 'paste': {
            this.$emit('paste')
            break
          }
          case 'new-file': {
            this.$emit('createFile')
            break
          }
          case 'new-folder': {
            this.$emit('createFolder')
            break
          }
          case 'open': {
            this.$emit('open')
            break
          }
          case 'open-in-new-tab': {
            this.$emit('openInNewTab')
            break
          }
          case 'properties': {
            this.$emit('properties')
            break
          }
          case 'about': {
            this.$emit('about')
            break
          }
          case 'github': {
            this.$emit('github')
            break
          }
          case 'hotkeys': {
            this.$emit('hotkeys')
            break
          }
          default: {
            if (id.startsWith('theme:')) {
              this.$emit('changeTheme', id.slice(6))
            }
          }
        }
      }
    },

    computed: {
      menuState() {
        return menuState
      },
      items(): MenuItemSpec[] {
        return [
          {
            label: 'File',
            submenu: [
              {
                label: 'New file',
                id: 'new-file'
              },
              {
                label: 'New folder',
                id: 'new-folder'
              },
              { type: 'separator' },
              {
                label: 'Open',
                id: 'open',
                enabled: this.hasSelection
              },
              {
                label: 'Open in new tab',
                id: 'open-in-new-tab',
                enabled: this.hasSelection
              },
              { type: 'separator' },
              {
                label: 'Properties',
                id: 'properties',
                enabled: this.hasSelection
              }
            ]
          },
          {
            label: 'Edit',
            submenu: [
              {
                label: 'Select All',
                id: 'select-all'
              },
              {
                label: 'Invert Selection',
                id: 'invert-selection'
              },
              { type: 'separator' },
              {
                label: 'Rename',
                id: 'rename',
                enabled: this.hasSelection
              },
              { type: 'separator' },
              {
                label: 'Copy',
                id: 'copy',
                enabled: this.hasSelection
              },
              {
                label: 'Cut',
                id: 'cut',
                enabled: this.hasSelection
              },
              {
                label: 'Paste',
                id: 'paste'
              },
              { type: 'separator' },
              {
                label: 'Move to Trash',
                id: 'move-to-trash',
                enabled: this.hasSelection
              }
            ]
          },
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
              { type: 'separator' },
              {
                label: 'Show hidden files',
                id: 'show-hidden',
                type: 'checkbox',
                checked: this.showHidden
              },
              {
                label: 'Show menu bar',
                id: 'show-menu-bar',
                type: 'checkbox',
                checked: this.showMenuBar
              },
              ...(IS_WEB ? [] : [{
                label: 'Custom window frame',
                id: 'custom-frame',
                type: 'checkbox' as const,
                checked: this.customFrame
              }]),
              {
                label: 'Tabs in side panel',
                id: 'tabs-in-side-panel',
                type: 'checkbox',
                checked: this.tabsInSidePanel
              },
              {
                label: 'Theme',
                submenu: themeState.list.map(name => ({
                  label: name.charAt(0).toUpperCase() + name.slice(1),
                  id: 'theme:' + name,
                  type: 'radio' as const,
                  checked: themeState.current === name
                }))
              },
              ...(IS_WEB ? [] : [{
                label: 'HTML menus',
                id: 'html-menus',
                type: 'checkbox' as const,
                checked: this.useHtmlMenus
              }]),
              { type: 'separator' },
              {
                label: 'Autohide left panel',
                id: 'autohide-left-panel',
                type: 'checkbox',
                checked: this.autohideLeftPanel
              },
              {
                label: 'Autohide top panel',
                id: 'autohide-top-panel',
                type: 'checkbox',
                checked: this.autohideTopPanel
              },
              { role: 'toggleDevTools', visible: this.isDev }              
            ]
          },
          {
            label: 'Help',
            submenu: [
              {
                label: 'About Sombra Manager',
                id: 'about'
              },
              {
                label: 'GitHub Repository',
                id: 'github'
              },
              { type: 'separator' },
              {
                label: 'Keyboard Shortcuts',
                id: 'hotkeys'
              }
            ]
          }
        ]
      }
    }
  })
</script>
<style scoped>
  .menu-bar{
    display:flex;
    height:22px;
    background:transparent;
    flex-shrink:0;
    align-items:stretch
  }
  .menu-bar.hidden{
    display:none
  }
  .menu-bar.drag{
    -webkit-app-region:drag
  }
  .menu-bar.drag .menu-item{
    -webkit-app-region:no-drag
  }
  .menu-item{
    padding:2px 10px;
    font-size:15px;
    font-family:sans-serif;
    cursor:default;
    display:flex;
    align-items:center;
    border-radius:3px
  }
  .menu-item:hover{
    background:v-bind('theme.menu.itemHoverBackground')
  }
</style>
