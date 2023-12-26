<template>
  <div class="status-bar">
    <div>{{items}} items</div>
    <div>{{files}} files</div>
    <div>{{dirs}} folders</div>
    <div v-if="selected">{{selected}} items selected {{prettyBytes(size)}} </div>
    <div></div>
  </div>
</template>
<script>
  import prettyBytes from 'pretty-bytes'
  import theme from '../../theme'

  export default {
    name:'StatusBar',
    props: {
      items:    Number,
      dirs:     Number,
      files:    Number,
      selected: Number,
      size:     Number
    },
    data(){
      return {
        theme
      }
    },
    methods: {
      prettyBytes
    }
  }
</script>
<style scoped>
  .status-bar{
    display:flex;
    flex-direction:row;
    border-top:1px solid v-bind('theme.borderColor');
    padding:5px;
    font-family:v-bind('theme.font')
  }
  .status-bar div{
    margin-right:15px
  }
</style>
