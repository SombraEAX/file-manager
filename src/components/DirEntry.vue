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
    <EntryIcon :size="entryIconSize" :is-dir="params.type === 'directory'" :type="entryType" :preview="thumb" />
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
        @keydown.enter.stop="$emit('confirmRename', $event.target.value)"
        @keydown.esc.stop="$emit('cancelRename')"
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
  import { theme } from '../stores/theme'
  import prettyBytes from 'pretty-bytes'
  import EntryIcon, { PreviewCell } from './EntryIcon.vue'
  import filetypes from '../../filetypes.json'
  import { requestThumbnail } from '../stores/thumbQueue'
  import { getXdgTypeByBasename } from '../xdg'

  const imageTypes = new Set(filetypes.image)

  const homedir = `/home/${window.electron.getUserName()}`

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
        theme,
        thumb: [] as Array<string | PreviewCell>,
        _thumbToken: 0,
      }
    },
    watch:{
      thumbKey(){
        this.loadThumb()
      },
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
      isImageFile(): boolean {
        return !!(this.params.ext && imageTypes.has(String(this.params.ext).toLowerCase()))
      },
      isRegularDir(): boolean {
        return this.params.type === 'directory' && !this.entryType
      },
      thumbKey(): string {
        const p = this.params.path || window.electron.join(this.address || '', this.params.name || '')
        return `${this.view}|${this.entryIconSize}|${p}`
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
        return getXdgTypeByBasename(name) || ''
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
      async loadThumb(): Promise<void> {
        const token = ++this._thumbToken
        if (this.view !== 'icons') {
          this.thumb = []
          return
        }
        const path = this.params.path || window.electron.join(this.address || '', this.params.name || '')
        const size = Math.max(this.entryIconSize, 40)
        if (this.params.type === 'directory') {
          const uris = this.isRegularDir ? await this.loadFolderThumbs(path, size) : []
          if (token === this._thumbToken) this.thumb = uris
          return
        }
        if (!this.isImageFile) {
          this.thumb = []
          return
        }
        const uri = await requestThumbnail(path, size)
        if (token === this._thumbToken) this.thumb = uri ? [uri] : []
      },
      async loadFolderThumbs(dirPath: string, size: number): Promise<PreviewCell[]> {
        try {
          const entries = await window.electron.readdir(dirPath)
          const files = entries.filter(e => e.type === 'file').slice(0, 9)
          const cells = await Promise.all(files.map(async e => {
            const ext = String(e.ext || '').toLowerCase()
            if (imageTypes.has(ext)) {
              const uri = await requestThumbnail(e.path || window.electron.join(dirPath, e.name), size)
              return { name: e.name, ext, uri: uri || undefined } as PreviewCell
            }
            return { name: e.name, ext } as PreviewCell
          }))
          return cells
        } catch (e) {
          return []
        }
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
    },
    mounted(){
      this.loadThumb()
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
    border:1px solid v-bind('theme.input.borderColor');
    border-radius:2px;
    outline:none;
    background: v-bind('theme.input.background');
    color: v-bind('theme.input.textColor');
    width:100%;
    box-sizing:border-box;
  }
  .rename-input:focus{
    border-color: v-bind('theme.input.borderColorActive');
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
