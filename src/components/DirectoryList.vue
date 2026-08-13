<template>
  <div class="dirs">
    <div v-for="dir in dirs" :key="dir.pathname" class="dir" :class="{selected:dir.pathname === selected}" @contextmenu="onRowContextMenu(dir, $event)">
      <div class="dir-label" @mouseenter="hoveredDir = dir.pathname" @mouseleave="hoveredDir = null">
        <div class="dir-icon" @click="iconClick(dir)">
          <EntryIcon v-show="hoveredDir !== dir.pathname" :size="16" is-dir :type="folderType(dir)" />
          <span v-show="hoveredDir === dir.pathname" class="expand-icon" :class="dir.open ? 'expanded' : 'collapsed'"></span>
        </div>
        <div class="caption" @click="$emit('select',dir.pathname)">{{dir.caption || dir.name}}</div>
        <span v-if="closable" class="tab-close" @click.stop="$emit('close',dir.pathname)">&times;</span>
      </div>
      <div class="subtree" v-if="dir.dirs && dir.open">
        <directory-list
          :dirs="dir.dirs" 
          :selected="selected" 
          @select="(ev: string) => $emit('select',ev)"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import type { DirItem } from '../types/domains'
  import { theme } from '../stores/theme'
  import EntryIcon from './EntryIcon.vue'

  const homedir = `/home/${window.electron.getUserName()}`

  let xdgCache: Record<string, string> | null = null
  function getXdgDirs(): Record<string, string> {
    if (xdgCache) return xdgCache
    xdgCache = {}
    try {
      const content = window.electron.readFileSync(window.electron.join(homedir, '.config/user-dirs.dirs'), 'utf8')
      const map: Record<string, string> = { XDG_DOWNLOAD_DIR:'downloads', XDG_DOCUMENTS_DIR:'documents', XDG_MUSIC_DIR:'music', XDG_PICTURES_DIR:'pictures', XDG_VIDEOS_DIR:'videos', XDG_DESKTOP_DIR:'desktop', XDG_PUBLICSHARE_DIR:'public' }
      for (const line of content.split('\n')) {
        const m = line.match(/^(\w+)="?\$HOME\/(.+?)"?$/)
        if (m && map[m[1]]) xdgCache[m[2]] = map[m[1]]
      }
    } catch(e) {}
    return xdgCache
  }

  export default defineComponent({
    emits: ['select', 'close', 'dir-context'],
    components: { EntryIcon },
    props: {
      dirs: {
        type: Array as PropType<DirItem[]>,
        default: () => []
      },
      selected: String,
      closable: Boolean,
      menuable: Boolean
    },
    name:'DirectoryList',
    data(){			
      return {
        theme,
        hoveredDir: null as string | null
      }
    },
    methods:{
      onRowContextMenu(dir: DirItem, ev: MouseEvent){
        if(!this.menuable) return
        ev.preventDefault()
        this.$emit('dir-context', { pathname: dir.pathname, x: ev.clientX, y: ev.clientY })
      },
      folderType(dir: DirItem): string {
        if (dir.name === '/') return 'root'
        const nameMap: Record<string, string> = {
          'home': 'home', 'desktop': 'desktop', 'documents': 'documents',
          'downloads': 'downloads', 'music': 'music', 'pictures': 'pictures',
          'videos': 'videos', 'trash': 'trash', 'public': 'public',
          'npm': 'npm', 'node_modules': 'npm',
        }
        const type = nameMap[dir.name.toLowerCase()]
        if (type) return type
        const xdg = getXdgDirs()
        return xdg[dir.name] || ''
      },
      async iconClick(dir: DirItem){
        dir.open = !dir.open

        if(dir.open){
          try {
            const items = await window.electron.readdir(dir.pathname)
            dir.dirs = items
              .filter(item => item.type === 'directory')
              .map(item => ({
                name: item.name,
                pathname: window.electron.join(dir.pathname, item.name)
              }))
          } catch(e) {
            dir.dirs = []
          }
        }else{
          delete dir.dirs
        }
      }
    }
  })
</script>
<style scoped>
  .subtree{
    margin-left:20px
  }
  .dir-icon{
    width:16px;
    height:16px;
    min-width:16px;
    display:inline-flex;
    align-items:center;
  }
  .expand-icon{
    width:16px;
    height:16px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    font-size:16px;
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    color:v-bind('theme.treeExpandIconColor');
  }
  .expand-icon.collapsed::before{ content:"\f0fe" }
  .expand-icon.expanded::before{ content:"\f146" }
  .expand-icon:hover{
    filter: brightness(1.3);
  }
  .dirs{
    display:flex;
    flex-direction:column
  }
  .dir-label{
    display:flex;
    flex-direction:row;
    align-items:center;
  }
  .dir-icon{
    cursor:pointer
  }
  .dir{
    display:flex;
    flex-direction:column;
  }
  .caption{
    flex:1;
    min-width:0;
    margin:auto;
    text-align:left;
    margin-left:5px;
    font-family:v-bind('theme.font');
    white-space: nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    cursor:pointer
  }
  .caption:hover{
    text-decoration:underline;
    color:v-bind('theme.linkHover')
  }

  .tab-close{
    display:none;
    margin:auto;
    margin-left:6px;
    margin-right:14px;
    font-size:18px;
    font-weight:bold;
    line-height:1;
    cursor:pointer;
    flex-shrink:0;
    color:v-bind('theme.sidebarTextColor')
  }
  .dir-label:hover .tab-close{
    display:block
  }
  .tab-close:hover{
    color:v-bind('theme.tabBar.closeHoverColor')
  }

  .selected>.dir-label>.caption{
    color:v-bind('theme.selected') !important;
    text-decoration:none !important;
    cursor:default !important
  }
</style>
