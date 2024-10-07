<template>
  <div class="outer">
    <div class="inner" @scroll="scroll" ref="scrollbox">
      <TableHeader
        v-if="view == 'table'"
        :columns="columns"
        :sortColumn="sortColumn"
        :sortOrder="sortOrder"
        :top="top"
        @changeWidth="changeWidth"
        @changeSort="changeSort"
        @moveColumn="moveColumn"
        @toggleColumnVisible="toggleColumnVisible"
      />
      <EntriesGroup
        v-for="group in groups"
        :name="group.name"
      >
        <DirEntry
          v-for="entry in group.entries"
          :columns="visibleColumns"
          :params="entry"
          :view="view"
          @openDir="openDir"
        />
      </EntriesGroup>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import TableHeader from './TableHeader.vue'
  import DirEntry from './DirEntry.vue'
  import EntriesGroup from './EntriesGroup.vue'
  
  export default {
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
      }
    },
    data(){
      return {
        top: 0,
        left: 0,
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
            field: 'mtime'
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
      openDir(dir){
        this.$emit('openDir',dir)
      },
      scroll(){
        this.left = this.$refs.scrollbox.scrollLeft
        this.top  = this.$refs.scrollbox.scrollTop
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
  .inner{
    position:absolute;
    left:0px;
    right:0px;
    top:0px;
    bottom:0px;
    overflow:auto;
  }
</style>
