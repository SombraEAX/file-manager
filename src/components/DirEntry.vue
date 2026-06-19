<template>
  <div
    class="main"
    :data-variant="view" 
    :data-selected="selected" 
    @click="click"
    @contextmenu.prevent="onContextMenu"
  >
    <EntryIcon :size="entryIconSize" :is-dir="params.type === 'directory'" :type="entryType" />
    <div class="label"
      v-for="(col,index) in columns" 
      :style="columnStyle(col,index)"
      :data-colname="col.colname"
    >
      {{stringify(params[col.field],col.colname)}}
    </div>
    <div v-if="view==='table'" class="label" style="width:5px"></div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import prettyBytes from 'pretty-bytes'
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
    emits: ['openDir', 'contextMenu'],
    components: { EntryIcon },
    props: {
      view:String,
      address:String,
      columns:{
        type: Array,
        default: () => []
      },
      params:{
        type: Object,
        default: () => []
      },
      selected:Boolean,
      iconSize:Number
    },
    data(){
      return {
        clicked:null,
        theme
      }
    },
    computed:{
      entryIconSize(){
        return this.view === 'icons' ? this.iconSize : 16
      },
      iconSizePx(){
        return this.entryIconSize + 'px'
      },
      entryType(){
        if (this.params.type === 'directory') return this.folderType(this.params.name)
        return this.params.ext || ''
      }
    },
    methods: {
      folderType(name) {
        if (name.toLowerCase() === 'node_modules') return 'npm'
        if (this.address !== homedir) return ''
        const nameMap = {
          'home': 'home', 'desktop': 'desktop', 'documents': 'documents',
          'downloads': 'downloads', 'music': 'music', 'pictures': 'pictures',
          'videos': 'videos', 'trash': 'trash', 'public': 'public',
          'npm': 'npm',
        }
        const type = nameMap[name.toLowerCase()]
        if (type) return type
        const xdg = getXdgDirs()
        return xdg[name] || ''
      },
      doubleClick(){
        if(this.params.type === 'directory')
          this.$emit('openDir', this.params.path || this.params.name)
      },
      onContextMenu(e){
        if(this.params.type === 'directory')
          this.$emit('contextMenu', { path: this.params.path || this.params.name, x: e.clientX, y: e.clientY });
      },
      click(){
        if(this.clicked && Date.now() - this.clicked < 500)
          this.doubleClick()
        this.clicked = Date.now()
      },
      columnStyle(col,index){
        if(this.view !== 'table') return {width:'auto'}
        let w = (index ? col.width : col.width - 26) + 'px'
        return {width: w, minWidth: w}
      },
      stringify(val,colname){
        if(val === undefined) return ''
        switch(colname){
          case 'modified': return val.toISOString().replace('T',' ').replace(/:[^:]+$/,'')
          case 'size':     return prettyBytes(val)
          default: return val
        }
      }
    }
  }
</script>
<style scoped>
  .main{
    align-items:center;
    display:flex;
    flex-direction:row;
    cursor:pointer;
    min-width:120px;
    background: v-bind('theme.background');
    color:      v-bind('theme.fontColor');
  }
  [data-selected="true"]{
    background: v-bind('theme.fileIcon.selected.background');
    color:      v-bind('theme.fileIcon.selected.fontColor')
  }
  [data-variant="table"]{
    min-width: min-content;
    color:      v-bind('theme.tableRow.params');
    padding-left: 10px;
  }
  [data-variant="table"] .label[data-colname] ~ .label[data-colname]{
    padding-left: 10px;
  }
  [data-variant="table"] .label[data-colname="name"]{
    padding-left: 3px;
  }
  [data-colname="name"]{
    color:      v-bind('theme.tableRow.name')
  }
  [data-variant="list"]{
    display:flex;
    width:100%
  }
  .main > :first-child{
    display:inline-flex;
    align-items:center;
  }
  [data-variant="icons"] .label{
    text-align:center;
    height:50px;
    word-wrap: break-word;
    white-space:wrap;
    width:     v-bind('iconSizePx');
    min-width:120px;
    max-width: v-bind('iconSizePx');
  }
  [data-variant="icons"]{
    display:flex;
    flex-direction:column !important;
    align-items:center
  }
  .label{
    box-sizing:border-box;   
    white-space:nowrap;
    overflow:hidden;
    display:block;
    font-family: v-bind('theme.font');
    font-size:16px;
    line-height:16px;
    padding-left:2px;
    padding-top:2px;
    padding-bottom:2px;
  }
  .icon{
    background-image:url('../assets/folder.png');
    background-size:100%;
  }
  .icon[data-type="file"]{
    background-image:url('../assets/file.png');
  }
  .main:hover{
    background: v-bind('theme.fileIcon.hover.background');
    color:      v-bind('theme.fileIcon.hover.fontColor')
  }
</style>
