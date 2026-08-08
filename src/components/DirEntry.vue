<template>
  <div
    class="main"
    :data-variant="view" 
    :data-selected="selected" 
    :data-focused="focused"
    :data-cut="isCut"
    @click="onClick"
    @dblclick.stop="onDoubleClick"
    @contextmenu.prevent="onContextMenu"
  >
    <EntryIcon :size="entryIconSize" :is-dir="params.type === 'directory'" :type="entryType" />
    <div class="label"
      v-for="(col,index) in columns"
      :key="col.colname"
      :style="columnStyle(col,index)"
      :data-colname="col.colname"
    >
      <input
        v-if="renaming && col.colname === 'name'"
        class="rename-input"
        ref="renameInput"
        :value="renamingValue"
        @input="$emit('update:renamingValue', $event.target.value)"
        @keydown.enter="$emit('confirmRename', $event.target.value)"
        @keydown.esc="$emit('cancelRename')"
        @blur="$emit('confirmRename', $event.target.value)"
        @click.stop
      />
      <template v-else>{{stringify(params[col.field],col.colname)}}</template>
    </div>
    <div v-if="view==='table'" class="label" style="width:5px"></div>
  </div>
</template>
<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import type { Column } from '../types/domains'
  import theme from '../../theme.json'
  import prettyBytes from 'pretty-bytes'
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
    emits: ['openDir', 'openFile', 'contextMenu', 'click', 'confirmRename', 'cancelRename', 'update:renamingValue'],
    components: { EntryIcon },
    props: {
      view:String,
      address:String,
      columns:{
        type: Array as PropType<Column[]>,
        default: () => []
      },
      params:{
        type: Object,
        default: () => ({})
      },
      selected:Boolean,
      focused:Boolean,
      iconSize:Number,
      renaming:Boolean,
      renamingValue:String,
      clipboardMode:String,
      clipboardPaths:{
        type: Array as PropType<string[]>,
        default: () => []
      }
    },
    data(){
      return {
        theme
      }
    },
    watch:{
      renaming(val: boolean){
        if(val){
          this.$nextTick(()=>{
            const raw = this.$refs.renameInput as HTMLInputElement | HTMLInputElement[] | undefined
            const input = Array.isArray(raw) ? raw[0] : raw
            if(input){
              input.focus()
              input.select()
            }
          })
        }
      }
    },
    computed:{
      entryIconSize(): number {
        return this.view === 'icons' ? Math.max(this.iconSize || 0, 40) : 16
      },
      iconSizePx(): string {
        return this.entryIconSize + 'px'
      },
      entryType(): string {
        if (this.params.type === 'directory') return this.folderType(this.params.name)
        return this.params.ext || ''
      },
      isCut(): boolean {
        if (this.clipboardMode !== 'cut' || !this.clipboardPaths.length) return false
        const entryPath = this.params.path || window.electron.join(this.address || '', this.params.name)
        return this.clipboardPaths.includes(entryPath)
      }
    },
    methods: {
      folderType(name: string): string {
        if (name.toLowerCase() === 'node_modules') return 'npm'
        if (this.address !== homedir) return ''
        const nameMap: Record<string, string> = {
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
      onDoubleClick(){
        if(this.params.type === 'directory')
          this.$emit('openDir', this.params.path || this.params.name)
        else
          this.$emit('openFile', this.params.path || window.electron.join(this.address || '', this.params.name))
      },
      onContextMenu(e: MouseEvent){
        this.$emit('contextMenu', { path: this.params.path || window.electron.join(this.address || '', this.params.name), x: e.clientX, y: e.clientY });
      },
      onClick($event: MouseEvent){
        this.$emit('click', $event)
      },
      columnStyle(col: Column, index: number): { width: string; minWidth?: string } {
        if(this.view !== 'table') return {width:'auto'}
        const w = (index ? col.width : col.width - 26) + 'px'
        return {width: w, minWidth: w}
      },
      stringify(val: unknown, colname: string): string {
        if(val === undefined) return ''
        switch(colname){
          case 'modified': return (val as Date).toISOString().replace('T',' ').replace(/:[^:]+$/,'')
          case 'size':     return prettyBytes(val as number)
          default: return String(val)
        }
      }
    }
  })
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
    box-sizing:border-box;
  }
  [data-selected="true"]{
    background: v-bind('theme.fileIcon.selected.background');
    color:      v-bind('theme.fileIcon.selected.fontColor');
    border-radius:3px;
  }
  [data-focused="true"]{
    outline:2px solid rgba(66,133,244,0.9);
    outline-offset:-2px;
    border-radius:6px;
  }
  [data-variant="table"]{
    min-width: min-content;
    color:      v-bind('theme.tableRow.params');
    padding-left:2px;
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
    width:100%;
    padding-left:2px;
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
    align-items:center;
    padding:10px 10px 6px;
  }
  [data-variant="icons"][data-selected="true"]{
    border-radius:6px;
  }
  [data-variant="icons"].main:hover{
    border-radius:6px;
  }
  [data-variant="icons"][data-selected="true"]:hover{
    border-radius:6px;
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
  .rename-input{
    font-family: v-bind('theme.font');
    font-size:16px;
    line-height:16px;
    padding:0 2px;
    border:1px solid #4a90d9;
    border-radius:2px;
    outline:none;
    background:#fff;
    color:#000;
    width:100%;
    box-sizing:border-box;
  }
  .main:hover{
    background: v-bind('theme.fileIcon.hover.background');
    color:      v-bind('theme.fileIcon.hover.fontColor');
    border-radius:3px;
  }
  [data-selected="true"]:hover{
    background: v-bind('theme.fileIcon.selected.background');
    color:      v-bind('theme.fileIcon.selected.fontColor');
    border-radius:3px;
  }
  [data-cut="true"]{
    opacity: 0.45;
  }
</style>
