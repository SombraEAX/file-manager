<template>
  <div class="outer" :class="{ 'table-mode': view === 'table' }">
    <div class="scroll-wrap">
      <div class="inner" :class="{ padded: view !== 'table' }" ref="inner" @scroll="onScroll">
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
        <div class="virtual-body" :style="{ height: totalHeight + 'px' }">
          <div
            v-for="item in visibleItems"
            :key="item.key"
            class="virtual-row"
            :style="{ transform: 'translateY(' + item.offset + 'px)', height: item.height + 'px' }"
          >
            <div
              v-if="item.type === 'header'"
              class="group-header"
              @click="toggleGroup(item.group.name)"
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
                @openDir="openDir"
                @contextMenu="onContextMenu"
                @click="select(item.entry)"
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
                  @openDir="openDir"
                  @contextMenu="onContextMenu"
                  @click="select(entry)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
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
  const LIST_ROW_H = 36
  const LIST_GAP = 5
  const ICONS_GAP = 20
  const ICONS_LABEL_H = 50

  export default {
    emits: ['openDir', 'changeSort', 'contextMenu', 'select'],
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
      iconSize: Number
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
        containerWidth: 300
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
              items.push({ type: 'entry', entry, group, height: TABLE_ROW_H, key: 't-' + group.name + '-' + (entry.path || entry.name) })
            }
          } else {
            const rowH = this.view === 'list' ? LIST_ROW_H : (Math.max(this.iconSize || 120, 120) + ICONS_LABEL_H + ICONS_GAP)
            for (let i = 0; i < group.entries.length; i += cols) {
              const chunk = group.entries.slice(i, i + cols)
              items.push({
                type: 'row',
                entries: chunk,
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
          const w = Math.max(this.iconSize || 120, 120) + ICONS_GAP
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
          gap: LIST_GAP + 'px'
        }
      },
      entryWrapStyle(){
        if (this.view === 'icons') {
          const w = Math.max(this.iconSize || 120, 120)
          return { width: w + 'px', flexShrink: 0 }
        }
        return { width: '150px', flexShrink: 0 }
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
      select(entry){
        let pathname = entry.path || window.electron.join(this.address, entry.name)
        this.$emit('select', pathname)
      },
      openDir(dir){
        this.$emit('openDir',dir)
      },
      onContextMenu(e){
        this.$emit('contextMenu', e);
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
</style>
