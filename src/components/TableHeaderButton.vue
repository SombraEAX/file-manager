<template>
  <div class="wrapper" :data-status="status">
    <div
      :data-red-line="redLine === 'left'"
      class="header-button" 
      :style="{width:width+'px'}"
      @mousedown.left="buttonMouseDown"
    >
      {{arrow}}
      {{caption}}
    </div>
    <div
      class="header-delimiter"
      @mousedown.left="delimiterMouseDown"
    >
      <div
        :data-red-line="redLine === 'right'"
        class="delimiter"
      ></div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  
  export default {
    emits: ['resizeend', 'resize', 'resizestart', 'moveend', 'movestart', 'move', 'changeSort'],
    props: {
      redLine:     String,
      width:       Number,
      caption:     String,
      sort:        String,
      status:      String
    },
    data(){
      return {
        theme,
        x:0,
        mousemove:false
      }
    },
    methods:{
      delimiterMouseUp(event){
        this.$emit('resizeend')
        window.removeEventListener('mouseup',this.delimiterMouseUp)
        window.removeEventListener('mousemove',this.delimiterMouseMove)        
      },
      delimiterMouseMove(event){
        let delta = this.x - event.clientX
        this.$emit('resize',this.width - delta)
        this.x = event.clientX
      },
      delimiterMouseDown(event){
        this.$emit('resizestart')
        this.x = event.clientX
        window.addEventListener('mousemove',this.delimiterMouseMove)
        window.addEventListener('mouseup',this.delimiterMouseUp)
      },
      buttonMouseDown(event){
        this.x = event.clientX
        window.addEventListener('mousemove',this.buttonMouseMove)
        window.addEventListener('mouseup',this.buttonMouseUp)
      },
      buttonMouseUp(event){
        window.removeEventListener('mouseup',this.buttonMouseUp)
        window.removeEventListener('mousemove',this.buttonMouseMove)        

        if(!this.mousemove){
          this.$emit(
            "changeSort",
            this.sort == 'asc' ? 'desc' : 'asc'
          )	
        }else{
        	this.$emit('moveend')
        }
        
        this.mousemove = false
      },
      buttonMouseMove(event){
        if(!this.mousemove) this.$emit('movestart', event.clientX)
        this.mousemove = true
        this.$emit('move', event.clientX)
      }
    },
    computed:{
      arrow(){
        if(this.sort == 'desc') return '▼'
        if(this.sort == 'asc') return '▲'
        return ''
      }
    }
  }
</script>
<style scoped>
  .wrapper{
    background:v-bind("theme.tableHeader.button.normal.background");
    border-bottom:1px solid v-bind("theme.tableHeader.bottomBorder");
    user-select:none;
    font-family:v-bind("theme.font");
  	display:flex;
  	align-items:center;
  	height:21px;
  	box-sizing:border-box
  }
  .header-delimiter{
  	box-sizing:border-box;
    display:flex;
    width:10px;
    height:21px;
    margin-left:-5px;
    margin-right:-5px;
    z-index:200;
  }
  .delimiter{
    margin:auto;
    width:1px;
    height:16px;
    background:v-bind("theme.tableHeader.delimiter.normal");
  }
  .wrapper:not([data-status="move"]) .header-delimiter:hover>div{
    background:v-bind("theme.tableHeader.delimiter.hover");  	
  }
  .wrapper:not([data-status="move"]) .header-delimiter:active>div{
    background:v-bind("theme.tableHeader.delimiter.active");  	
  }
  .header-button[data-red-line="true"]{
    border-left:3px solid v-bind("theme.tableHeader.delimiter.insert")
  }
  .header-button{
    white-space: nowrap;
    overflow: hidden;
    font-size:16px;
  	height:20px;
    box-sizing:border-box;
    padding-top:2px;
    padding-left:10px;
    z-index:100;
    padding-right:10px;
  }
  .delimiter[data-red-line="true"]{
    height:100%;
    width:3px;
    background:v-bind("theme.tableHeader.delimiter.insert")
  }
  [data-status="normal"] .header-button{
    cursor:pointer
  }
  [data-status="normal"] .header-delimiter{
    cursor:col-resize
  } 
  [data-status="normal"] .header-button:hover{
    background:v-bind("theme.tableHeader.button.hover.background");
  }
  .header-button:active{
    background:v-bind("theme.tableHeader.button.active.background") !important
  }
</style>
