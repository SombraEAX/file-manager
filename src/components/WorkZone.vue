<template>
  <div class="outer" :class="{ 'table-mode': view === 'table' }">
    <div class="scroll-wrap" ref="scrollWrap">
      <div class="inner" :class="{ padded: view !== 'table' }" ref="inner" @scroll="onScroll" @mousedown.self="onMouseDown" @click.self="deselectAll" @contextmenu.self.prevent="onBackgroundContextMenu">
        <TableHeader
          v-if="view == 'table'"
          :columns="columns"
          :sortColumn="sortColumn"
          :sortOrder="sortOrder"
          @changeWidth="changeWidth"
          @changeSort="changeSort"
          @moveColumn="moveColumn"
          @toggleColumnVisible="toggleColumnVisible"
        />
        <div class="virtual-body" :style="{ height: totalHeight + 'px' }" @mousedown="onMouseDown" @click.self="deselectAll" @contextmenu.self.prevent="onBackgroundContextMenu">
          <div
            v-for="item in visibleItems"
            :key="item.key"
            class="virtual-row"
            :style="{ transform: 'translateY(' + item.offset + 'px)', height: item.height + 'px' }"
          >
            <div
              v-if="item.type === 'header'"
              class="group-header"
              @click.stop="toggleGroup(item.group.name)"
            >
              <div class="group-header-icon" :data-expand="!isGroupCollapsed(item.group.name)"></div>
              <div class="group-header-title">{{ item.group.name }}</div>
            </div>
            <template v-else-if="view === 'table'">
              <DirEntry
                :columns="visibleColumns"
                :params="item.entry"
                :view="view"
                :selected="item.entry.selected"
                :iconSize="iconSize"
                :address="address"
                :renaming="renamingPath === item.path"
                :renamingValue="renamingPath === item.path ? renamingValue : ''"
                :clipboardMode="clipboardMode"
                :clipboardPaths="clipboardPaths"
                @openDir="openDir"
                @contextMenu="onContextMenu"
                @click="select(item.entry, $event)"
                @confirmRename="$emit('confirmRename', $event)"
                @cancelRename="$emit('cancelRename')"
                @update:renamingValue="$emit('update:renamingValue', $event)"
              />
            </template>
            <div v-else class="grid-row" :style="gridRowStyle">
              <div
                v-for="entry in item.entries"
                :key="entry.path || entry.name"
                :style="entryWrapStyle"
              >
                <DirEntry
                  :columns="visibleColumns"
                  :params="entry"
                  :view="view"
                  :selected="entry.selected"
                  :iconSize="iconSize"
                  :address="address"
                  :renaming="renamingPath === (entry.path || address + '/' + entry.name)"
                  :renamingValue="renamingPath === (entry.path || address + '/' + entry.name) ? renamingValue : ''"
                  :clipboardMode="clipboardMode"
                  :clipboardPaths="clipboardPaths"
                  @openDir="openDir"
                  @contextMenu="onContextMenu"
                  @click="select(entry, $event)"
                  @confirmRename="$emit('confirmRename', $event)"
                  @cancelRename="$emit('cancelRename')"
                  @update:renamingValue="$emit('update:renamingValue', $event)"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-if="isTrash" class="trash-bottom-spacer" @mousedown="onMouseDown" @click.self="deselectAll" @contextmenu.self.prevent="onBackgroundContextMenu"></div>
      </div>
      <div class="rubber-band" v-if="rubberBand" :style="rubberBandStyle"></div>
      <div class="spacer"></div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import TableHeader from './TableHeader.vue'
  import DirEntry from './DirEntry.vue'

  const TABLE_ROW_H = 22
  const HEADER_H = 30
  const BUFFER = 200
  const LIST_ITEM_W = 155
  const LIST_ROW_H = 22
  const LIST_GAP = 2
  const ICONS_GAP = 20
  const ICONS_ROW_GAP = 4
  const ICONS_LABEL_H = 50

  export default {
    emits: ['openDir', 'changeSort', 'contextMenu', 'backgroundContextMenu', 'select', 'selectRange', 'confirmRename', 'cancelRename', 'update:renamingValue'],
    components:{
      TableHeader,
      DirEntry
    },
    props: {
      sortOrder: String,
      sortColumn: String,
      address: String,
      view: String,
      groups: {
        type: Array,
        default: () => []
      },
      isTrash: Boolean,
      iconSize: Number,
      renamingPath: String,
      renamingValue: String,
      clipboardMode: String,
      clipboardPaths: {
        type: Array,
        default: () => []
      }
    },
    data(){
      return {
        width:100,
        theme,
        files: [],
        columns: [
          {
            caption:'Name',
            width:300,
            visible: true,
            colname: 'name',
            field: 'name'
          },
          {
            caption:'Modified',
            width:150,
            visible: true,
            colname: 'modified',
            field: 'modified'
          },
          {
            caption:'Size',
            width:75,
            visible: true,
            field: 'size',
            colname:'size'
          },
          {
            caption:'Type',
            width:200,
            visible: true,
            field: 'filetype',
            colname:'type'
          }
        ],
        scrollTop: 0,
        viewportHeight: 600,
        collapsedGroups: {},
        containerWidth: 300,
        dragSelecting: false,
        _justDragged: false,
        _dragStartClientX: 0,
        _dragStartClientY: 0,
        _scrollTopAtStart: 0,
        _lastClientX: 0,
        _lastClientY: 0,
        _autoScrollDir: 0,
        rubberBand: null
      }
    },
    computed:{
      visibleColumns(){
        if(this.view !== 'table') return this.columns.filter(col => col.colname === 'name')
        return this.columns.filter(col => col.visible)
      },
      flatItems(){
        const items = []
        const cols = this.itemsPerRow
        for (const group of this.groups) {
          if (group.name) {
            items.push({ type: 'header', group, height: HEADER_H, key: 'h-' + group.name })
          }
          if (group.name && this.collapsedGroups[group.name]) continue
          if (this.view === 'table') {
            for (const entry of group.entries) {
              const p = entry.path || window.electron.join(this.address, entry.name)
              items.push({ type: 'entry', entry, group, height: TABLE_ROW_H, key: 't-' + group.name + '-' + (entry.path || entry.name), path: p })
            }
          } else {
            const rowH = this.view === 'list' ? LIST_ROW_H : (Math.max(this.iconSize || 120, 40) + ICONS_LABEL_H + 21)
            for (let i = 0; i < group.entries.length; i += cols) {
              const chunk = group.entries.slice(i, i + cols)
              const paths = chunk.map(e => e.path || window.electron.join(this.address, e.name))
              items.push({
                type: 'row',
                entries: chunk,
                paths,
                group,
                height: rowH,
                key: 'r-' + group.name + '-' + i
              })
            }
          }
        }
        let offset = 0
        for (const item of items) {
          item.offset = offset
          offset += item.height
        }
        return items
      },
      totalHeight(){
        const items = this.flatItems
        return items.length ? items[items.length - 1].offset + items[items.length - 1].height : 0
      },
      visibleItems(){
        const top = this.scrollTop - BUFFER
        const bottom = this.scrollTop + this.viewportHeight + BUFFER
        const items = this.flatItems
        const start = this.lowerBound(items, top)
        let end = start
        while (end < items.length && items[end].offset < bottom) end++
        return items.slice(start, end)
      },
      itemsPerRow(){
        if (this.view === 'icons') {
          const w = Math.max(this.iconSize || 120, 120) + ICONS_GAP + 20
          return Math.max(1, Math.floor(this.containerWidth / w))
        }
        if (this.view === 'list') {
          return Math.max(1, Math.floor(this.containerWidth / LIST_ITEM_W))
        }
        return 1
      },
      gridRowStyle(){
        if (this.view === 'icons') {
          return {
            display: 'flex',
            flexWrap: 'wrap',
            gap: ICONS_GAP + 'px',
            paddingLeft: '2px'
          }
        }
        return {
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: LIST_GAP + 'px',
          rowGap: '0px',
          padding: '0 8px'
        }
      },
      entryWrapStyle(){
        if (this.view === 'icons') {
          const w = Math.max(this.iconSize || 120, 120) + 20
          return { width: w + 'px', flexShrink: 0 }
        }
        return { width: '150px', flexShrink: 0 }
      },
      entryRects(){
        const rects = []
        for (const item of this.flatItems) {
          if (item.type === 'header') continue
          if (this.view === 'table') {
            rects.push({ path: item.path, y: item.offset, height: item.height, x: 0, width: this.containerWidth })
          } else if (item.type === 'row') {
            const entryW = this.view === 'icons' ? Math.max(this.iconSize || 120, 120) + 20 : 150
            const gap = this.view === 'icons' ? ICONS_GAP : LIST_GAP
            for (let i = 0; i < item.entries.length; i++) {
              rects.push({ path: item.paths[i], y: item.offset, height: item.height, x: i * (entryW + gap), width: entryW })
            }
          }
        }
        return rects
      },
      rubberBandStyle(){
        if (!this.rubberBand) return { display: 'none' }
        return {
          position: 'absolute',
          left: this.rubberBand.vx + 'px',
          top: this.rubberBand.vy + 'px',
          width: this.rubberBand.vw + 'px',
          height: this.rubberBand.vh + 'px',
            background: 'rgba(66, 133, 244, 0.2)',
          border: '1px solid rgba(66, 133, 244, 0.5)',
          pointerEvents: 'none',
          zIndex: 100
        }
      }
    },
    methods: {
      isGroupCollapsed(name){
        return !!this.collapsedGroups[name]
      },
      toggleGroup(name){
        this.collapsedGroups = { ...this.collapsedGroups, [name]: !this.collapsedGroups[name] }
      },
      lowerBound(arr, val){
        let lo = 0, hi = arr.length
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (arr[mid].offset + arr[mid].height < val) lo = mid + 1
          else hi = mid
        }
        return lo
      },
      onMouseDown(event){
        if (event.button !== 0) return
        if (event.target.closest('[data-variant]')) return
        this._justDragged = false
        this._dragStartClientX = event.clientX
        this._dragStartClientY = event.clientY
        this._scrollTopAtStart = this.scrollTop
        this.dragSelecting = true
        this.rubberBand = null
        this.$emit('select', null)
        document.addEventListener('mousemove', this.onDragMove)
        document.addEventListener('mouseup', this.onDragEnd)
      },
      onDragMove(event){
        if (!this.dragSelecting) return
        this._lastClientX = event.clientX
        this._lastClientY = event.clientY
        this._autoScroll()
        this._updateDragSelection()
      },
      _autoScroll(){
        const wrapRect = this.$refs.scrollWrap.getBoundingClientRect()
        const MARGIN = 50
        let dir = 0
        let dist = 0
        if (this._lastClientY < wrapRect.top) {
          dir = -1
          dist = wrapRect.top - this._lastClientY + MARGIN
        } else if (this._lastClientY > wrapRect.bottom) {
          dir = 1
          dist = this._lastClientY - wrapRect.bottom + MARGIN
        } else if (this._lastClientY - wrapRect.top < MARGIN) {
          dir = -1
          dist = MARGIN - (this._lastClientY - wrapRect.top)
        } else if (wrapRect.bottom - this._lastClientY < MARGIN) {
          dir = 1
          dist = MARGIN - (wrapRect.bottom - this._lastClientY)
        }
        this._autoScrollDir = dir
        if (!dir) return
        const speed = Math.min(40, Math.max(5, dist / 3))
        const inner = this.$refs.inner
        inner.scrollTop += dir * speed
        this.scrollTop = inner.scrollTop
      },
      _updateDragSelection(){
        const wrapRect = this.$refs.scrollWrap.getBoundingClientRect()
        const vx = Math.min(this._dragStartClientX, this._lastClientX) - wrapRect.left
        const vy = Math.min(this._dragStartClientY, this._lastClientY) - wrapRect.top
        const vw = Math.abs(this._lastClientX - this._dragStartClientX)
        const vh = Math.abs(this._lastClientY - this._dragStartClientY)
        this.rubberBand = { vx, vy, vw, vh }

        const inner = this.$refs.inner
        const iRect = inner.getBoundingClientRect()
        const x1 = Math.min(this._dragStartClientX, this._lastClientX) - iRect.left
        const x2 = Math.max(this._dragStartClientX, this._lastClientX) - iRect.left
        const startDocY = this._dragStartClientY - iRect.top + this._scrollTopAtStart
        const curDocY = this._lastClientY - iRect.top + this.scrollTop
        const y1 = Math.min(startDocY, curDocY)
        const y2 = Math.max(startDocY, curDocY)

        const paths = this.entryRects
          .filter(r => r.x < x2 && r.x + r.width > x1 && r.y < y2 && r.y + r.height > y1)
          .map(r => r.path)
        this.$emit('selectRange', paths)
      },
      onDragEnd(){
        this.dragSelecting = false
        this._justDragged = true
        this.rubberBand = null
        this._autoScrollDir = 0
        document.removeEventListener('mousemove', this.onDragMove)
        document.removeEventListener('mouseup', this.onDragEnd)
      },
      select(entry, event){
        let pathname = entry.path || window.electron.join(this.address, entry.name)
        this.$emit('select', { path: pathname, ctrl: event.ctrlKey || event.metaKey, shift: event.shiftKey })
      },
      deselectAll(){
        if (this._justDragged) return
        this.$emit('select', null)
      },
      openDir(dir){
        this.$emit('openDir',dir)
      },
      onContextMenu(e){
        this.$emit('contextMenu', e);
      },
      onBackgroundContextMenu(event){
        this.$emit('backgroundContextMenu', { x: event.clientX, y: event.clientY })
      },
      changeSort(col,sort){
        this.$emit('changeSort',col,sort)
      },
      changeWidth(index,width){
        this.columns[index].width = width
      },
      toggleColumnVisible(index){
        this.columns[index].visible = !this.columns[index].visible
      },
      moveColumn(fromIndex,toIndex){
        if(fromIndex>toIndex){
          const [element] = this.columns.splice(fromIndex, 1)
          this.columns.splice(toIndex, 0, element)
        }else{
          let element = this.columns[fromIndex]
          this.columns.splice(toIndex, 0, element)
          this.columns.splice(fromIndex, 1)
        }
      },
      onScroll(){
        this.scrollTop = this.$refs.inner.scrollTop
      },
      updateViewport(){
        const el = this.$refs.inner
        if (!el) return
        this.viewportHeight = el.clientHeight
        this.containerWidth = el.clientWidth
      },
      scrollToPath(path){
        if (!path) return
        for (const group of this.groups) {
          for (const entry of group.entries) {
            const p = entry.path || window.electron.join(this.address, entry.name)
            if (p !== path) continue
            if (this.collapsedGroups[group.name]) {
              this.collapsedGroups = { ...this.collapsedGroups, [group.name]: false }
            }
            break
          }
        }
        const items = this.flatItems
        let item = null
        for (const it of items) {
          if (it.type === 'entry' && it.path === path) { item = it; break }
          if (it.type === 'row' && it.paths && it.paths.includes(path)) { item = it; break }
        }
        if (!item) return
        const el = this.$refs.inner
        const viewport = this.viewportHeight || (el ? el.clientHeight : 600)
        const itemTop = item.offset
        const itemBottom = item.offset + item.height
        const curTop = el ? el.scrollTop : this.scrollTop
        if (itemTop >= curTop && itemBottom <= curTop + viewport) return
        let target = itemTop - (viewport - item.height) / 2
        target = Math.max(0, target)
        if (el) el.scrollTop = target
        this.scrollTop = target
      }
    },
    mounted(){
      this.updateViewport()
      this._ro = new ResizeObserver(() => requestAnimationFrame(() => this.updateViewport()))
      this._ro.observe(this.$refs.inner)
    },
    beforeUnmount(){
      this._ro?.disconnect()
    }
  }
</script>
<style scoped>
  .outer{
    position:relative;
    width:100%;
    height:100%
  }
  .scroll-wrap{
    position:absolute;
    left:0px;
    right:0px;
    top:0px;
    bottom:0px;
    overflow:hidden;
  }
  .inner{
    position:absolute;
    left:0px;
    top:0px;
    bottom:0px;
    right:-12px;
    overflow-y:scroll;
    padding-right:12px;
  }
  .inner.padded{
    padding:10px;
  }
  .scroll-wrap:not(:hover) .inner.padded{
    padding-right:12px;
  }
  .scroll-wrap:hover .inner{
    right:0px;
    padding-right:0px;
  }
  .scroll-wrap:hover .inner.padded{
    right:0px;
    padding:10px;
    padding-right:0px;
  }
  .virtual-body{
    position:relative;
  }
  .virtual-row{
    position:absolute;
    left:0;
    right:0;
    will-change:transform;
  }
  .outer.table-mode .virtual-row{
    padding-left:8px;
  }
  .group-header{
    display:flex;
    align-items:center;
    height:28px;
    padding:0 5px;
    margin:1px 0;
    cursor:pointer;
    color:v-bind('theme.groupTitle.fontColor');
    border-radius:5px;
  }
  .group-header:hover{
    color:v-bind('theme.groupTitle.hoverFontColor');
    background-color:v-bind('theme.groupTitle.hoverBackgroundColor');
  }
  .group-header-title{
    flex:1;
    font-size:16px;
    font-family:v-bind('theme.font')
  }
  .group-header-icon{
    width:20px;
    height:20px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    margin-right:4px;
  }
  .group-header-icon::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    font-size:14px
  }
  .group-header-icon[data-expand="true"]::before{
    content:"\f146"
  }
  .group-header-icon[data-expand="false"]::before{
    content:"\f0fe"
  }
  .grid-row{
    align-items:center;
  }
  .spacer{
    position:absolute;
    right:0px;
    top:0px;
    bottom:0px;
    width:12px;
    pointer-events:none;
  }
  .scroll-wrap:hover .spacer{
    display:none;
  }
  .outer.table-mode .scroll-wrap{
    top:5px;
  }
  .trash-bottom-spacer{
    height:55px;
  }
</style>
