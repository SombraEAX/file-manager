<template>
  <div class="outer">
    <div class="inner">
      <directory-list
        :dirs="dirs" 
        :selected="selected" 
        @select="(ev) => $emit('select',ev)"
      />
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import DirectoryList from './DirectoryList.vue'

  export default {
    props: {
      dirs: {
        type: Array,
        default: () => []
      },
      selected: String	
    },
    components: { DirectoryList },
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
    box-sizing:border-box
  }
  .outer{
    display: block;
    position:relative;
    overflow-y:auto;
    border-right:1px solid v-bind('theme.borderColor')
  }
</style>
