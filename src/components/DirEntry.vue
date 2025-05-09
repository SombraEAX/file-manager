<template>
  <div class="main" :data-variant="view" :data-selected="selected" @click="click">
    <div
      class="icon" 
      :style="{width:actualIconSize, height:actualIconSize, minWidth:actualIconSize}"
      :data-type="params.type"
    ></div>
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
  
  export default {
    emits: ['openDir'],
    props: {
      view:String,
      columns:{
        type: Array,
        default: () => []
      },
      params:{
        type: Object,
        default: () => []
      },
      selected:Boolean
    },
    data(){
      return {
        clicked:null,
        iconSize:200,
        theme
      }
    },
    computed:{
      actualIconSize(){
        if(this.view === 'icons') return this.iconSize + 'px'
        return '16px'
      }
    },
    methods: {
      doubleClick(){
        if(this.params.type === 'directory')
          this.$emit('openDir',this.params.name)
      },
      click(){
        if(this.clicked && Date.now() - this.clicked < 500)
          this.doubleClick()
        this.clicked = Date.now()
      },
      columnStyle(col,index){
        if(this.view !== 'table') return {width:'auto'}
        let w = (index ? col.width : col.width - 21) + 'px'
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
    background: v-bind('theme.background');
    color:      v-bind('theme.fontColor');
  }
  [data-selected="true"]{
    background: v-bind('theme.fileIcon.selected.background');
    color:      v-bind('theme.fileIcon.selected.fontColor')
  }
  [data-variant="table"]{
    min-width: min-content;
    color:      v-bind('theme.tableRow.params')
  }
  [data-colname="name"]{
    color:      v-bind('theme.tableRow.name')
  }
  [data-variant="list"]{
    max-width:150px;
    width:150px;
    display:inline-flex;
    margin-left:5px
  }
  [data-variant="table"] .icon{
    margin-left:5px
  }
  [data-variant="icons"] .label{
    text-align:center;
    height:50px;
    word-wrap: break-word;
    white-space:wrap;
    width:200px;
    max-width:200px;
  }
  [data-variant="icons"]{
    width:200px;
    margin:10px;
    display:inline-flex;
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
