<template>
  <div class="placeholder">
    <div
      class="header"
      ref="header" 
      :data-status="status"         
      :style="{ top: top + 'px' }"
      @click.right="menu"
    >
      <TableHeaderButton
        v-for="(column,index) in visibleColumns"
        :ref="'button' + index"
        :key="index"
        :redLine="index == this.insert - 1 ? 'right' : !index && insert === 0 && 'left'"
        :status="status"
        :sort="column.colname == sortColumn && sortOrder"
        :caption="column.caption"
        :width="column.width"
        @changeSort="sort => changeSort(column.colname, sort)"
        @resize="width => changeWidth(index,width)"
        @resizestart="resizestart"
        @resizeend="resizeend"
        @move="move"
        @movestart="moveStart(index)"
        @moveend="moveEnd(index)"
      />
      <div class="end"></div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import TableHeaderButton from './TableHeaderButton.vue'
  
  export default {
    emits: ['toggleColumnVisible', 'moveColumn', 'changeSort', 'changeWidth'],
    components:{
      TableHeaderButton
    },
    props: {
      top: Number,
      sortColumn: String,
      sortOrder: String,
      columns:{
        type: Array,
        default: () => []
      }
    },
    data(){
      return {
        insert:null,
        theme,
        x:0,
        left:0,
        width:0,
        status:"normal"
      }
    },
    computed:{
      visibleColumns(){
        return this.columns.filter(col => col.visible)
      }
    },
    methods: {
      resizestart(){
        this.status = "resize"
      },
      resizeend(){
        this.status = "normal"
      },
      move(x){
        x = Math.abs(x - this.left)
        let pos = 0
        let i = 0
        let distance = x
        for(let [index,{width}] of Object.entries(this.columns)){
          pos+=width
          let dist = Math.abs(pos-x)
          if(dist < distance){
            distance = dist
            i = Number(index) + 1
          }
        }
        this.insert = i
      },
      menu({clientX,clientY}){
        let { ipcRenderer } = window.electron

        ipcRenderer.send('show-menu', {
          x: clientX,
          y: clientY,
          items:this.columns.map(col => ({
            label:   col.caption,
            type:    'checkbox',
            checked: col.visible
          }))
        })

        ipcRenderer.once(
          'show-menu-reply',
          (_, index) => this.$emit('toggleColumnVisible',index)
        )
      },
      moveStart(x){
        this.status = "move"
        let {left,width} = this.$refs.header.getBoundingClientRect()
        this.left = left
        this.width = width
        this.x = x
      },
      moveEnd(index){
        this.$emit('moveColumn',index,this.insert)
        this.status = "normal"
        this.insert = null
      },
      changeSort(index, sort){
        this.$emit("changeSort",index,sort)
      },
      changeWidth(index,width){ 
        this.$emit("changeWidth",index,width)
      }
    }
  }
</script>
<style scoped>
  .placeholder{
    height:21px
  }
  .end{
    background:v-bind("theme.tableHeader.button.normal.background");
    border-bottom:1px solid v-bind("theme.tableHeader.bottomBorder");
    height:21px;
    width:5px;
    min-width:5px;
    box-sizing:border-box
  }
  .header{
    display:flex;
    width:100%;
    background:v-bind("theme.tableHeader.button.normal.background");
    border-bottom:1px solid v-bind("theme.tableHeader.bottomBorder");
    height:21px;
    box-sizing:border-box;
    position:absolute;
  }
  .header[data-status="resize"]{
    cursor:col-resize
  }
  .header[data-status="move"]{
    cursor:grabbing
  }
</style>
