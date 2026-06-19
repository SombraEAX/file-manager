<template>
  <div class="outer" :class="{ 'table-mode': view === 'table' }">
    <div class="scroll-wrap">
      <div class="inner" :class="{ padded: view !== 'table' }">
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
        <EntriesGroup
          v-for="group in groups"
          :name="group.name"
          :view="view"
          :iconSize="iconSize"
        >
          <DirEntry
            v-for="entry in group.entries"
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
        </EntriesGroup>
      </div>
      <div class="spacer"></div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import TableHeader from './TableHeader.vue'
  import DirEntry from './DirEntry.vue'
  import EntriesGroup from './EntriesGroup.vue'
 
  
  export default {
    emits: ['openDir', 'changeSort', 'contextMenu', 'select'],
    components:{
      EntriesGroup,
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
      }
    },
    computed:{
      visibleColumns(){
        if(this.view !== 'table') return this.columns.filter(col => col.colname === 'name')
        return this.columns.filter(col => col.visible)
      }
    },
    methods: {
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
      }
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
