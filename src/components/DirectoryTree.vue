<template>
  <side-bar
    @resize="(ev) => $emit('resize',ev)"
    :width="width"
    minWidth="150"
    position="left"
  >
    <div class="outer scrollbox">
      <div class="inner">
        <directory-list
          :dirs="dirs" 
          :selected="selected" 
          @select="(ev) => $emit('select',ev)"
        />
      </div>
    </div>
  </side-bar>
</template>
<script>
  import theme from '../../theme.json'
  import DirectoryList from './DirectoryList.vue'
  import SideBar from './SideBar.vue'

  export default {
    emits: ['select', 'resize'],
    props: {
      width: Number,
      dirs: {
        type: Array,
        default: () => []
      },
      selected: String	
    },
    methods:{
    },
    components: { DirectoryList, SideBar },
    data(){			
      return {
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
    height:100%;
    flex:1;
    display: block;
    position:relative;
  }  
</style>
