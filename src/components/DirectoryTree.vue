<template>
  <div
    class="wrapper"
    :style="{width: width+'px', minWidth: width+'px'}"
  >
    <div class="outer">
      <div class="inner">
        <directory-list
          :dirs="dirs" 
          :selected="selected" 
          @select="(ev) => $emit('select',ev)"
        />
      </div>
    </div>
    <div class="line" @mousedown="ev => mousedown(ev)"></div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import DirectoryList from './DirectoryList.vue'

  export default {
    props: {
      width: Number,
      dirs: {
        type: Array,
        default: () => []
      },
      selected: String	
    },
    methods:{
      mousemove(event){
        this.$emit('resize', this.width + event.clientX - this.x)
        this.x = event.clientX
      },
      mousedown(event){
        this.x = event.clientX
        window.addEventListener('mousemove', this.mousemove)
        window.addEventListener('mouseup',   this.mouseup)
      },
      mouseup(){
        window.removeEventListener('mousemove', this.mousemove)
        window.removeEventListener('mouseup',   this.mouseup)
      }
    },
    components: { DirectoryList },
    data(){			
      return {
        x:0,
        theme
      }
    }
  }
</script>
<style scoped>
  .inner{
    position:absolute;
    left:0px;
    top:0px;
    width:100%;
    height:100%;
    padding:10px;
    box-sizing:border-box;
  }
  .outer{
    flex:1;
    display: block;
    position:relative;
    overflow-y:auto;
    border-right:1px solid v-bind('theme.borderColor')
  }
  .wrapper{
    display:flex;
    flex-direction:row;
  }
  .line{
    width:6px;
    margin-left:-3px;
    margin-right:-3px;
    cursor:col-resize;
    z-index:300;
    height:100%;
  }  
</style>
