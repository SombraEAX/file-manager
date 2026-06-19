<template>
  <div class="dirs">
    <div v-for="dir in dirs" class="dir" :class="{selected:dir.pathname === selected}">
      <div class="dir-label" @mouseenter="hoveredDir = dir.pathname" @mouseleave="hoveredDir = null">
        <div class="dir-icon" @click="iconClick(dir)">
          <EntryIcon v-show="hoveredDir !== dir.pathname" :size="16" is-dir :type="folderType(dir)" />
          <span v-show="hoveredDir === dir.pathname" class="expand-icon" :class="dir.open ? 'expanded' : 'collapsed'"></span>
        </div>
        <div class="caption" @click="$emit('select',dir.pathname)">{{dir.caption || dir.name}}</div>
      </div>
      <div class="subtree" v-if="dir.dirs && dir.open">
        <directory-list
          :dirs="dir.dirs" 
          :selected="selected" 
          @select="(ev) => $emit('select',ev)"
        />
      </div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import EntryIcon from './EntryIcon.vue'

  const homedir = `/home/${window.electron.getUserName()}`

  let xdgCache = null
  function getXdgDirs() {
    if (xdgCache) return xdgCache
    xdgCache = {}
    try {
      const content = window.electron.readFileSync(window.electron.join(homedir, '.config/user-dirs.dirs'), 'utf8')
      const map = { XDG_DOWNLOAD_DIR:'downloads', XDG_DOCUMENTS_DIR:'documents', XDG_MUSIC_DIR:'music', XDG_PICTURES_DIR:'pictures', XDG_VIDEOS_DIR:'videos', XDG_DESKTOP_DIR:'desktop', XDG_PUBLICSHARE_DIR:'public' }
      for (const line of content.split('\n')) {
        const m = line.match(/^(\w+)="?\$HOME\/(.+?)"?$/)
        if (m && map[m[1]]) xdgCache[m[2]] = map[m[1]]
      }
    } catch(e) {}
    return xdgCache
  }

  export default {
    emits: ['select'],
    components: { EntryIcon },
    props: {
      dirs: {
        type: Array,
        default: () => []
      },
      selected:String
    },
    name:'DirectoryList',
    data(){			
      return {
        theme,
        hoveredDir: null
      }
    },
    methods:{
      folderType(dir) {
        const nameMap = {
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
      iconClick(dir){
        dir.open = !dir.open

        if(dir.open){
          dir.dirs = 
            window.electron
            .readdirSync(dir.pathname)
            .map(subdir => ({
              name: subdir,
              pathname: window.electron.join(dir.pathname, subdir) 	
            }))
            .filter(subdir => window.electron.isDir(subdir.pathname))		
        }else{
          delete dir.dirs
        }
      }
    }
  }
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
    color:#3498db;
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
    flex-direction:row
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
    margin:auto;
    text-align:left;
    margin-left:5px;
    font-family:v-bind('theme.font');
    white-space: nowrap;
    cursor:pointer
  }
  .caption:hover{
    text-decoration:underline;
    color:v-bind('theme.linkHover')
  }

  .selected>.dir-label>.caption{
    color:v-bind('theme.selected') !important;
    text-decoration:none !important;
    cursor:default !important
  }
</style>
