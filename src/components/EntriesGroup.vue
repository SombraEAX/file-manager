<template>
  <div class="entries-group">
    <div class="titlebar" @click="expand=!expand" v-if="name">
      <div class="title">{{name}}</div>
      <div class="icon" :data-expand="expand"></div>
    </div>
    <div v-if="!name || expand">
      <slot></slot>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme'

  export default {
    name:'EntriesGroup',
    props: {
      name:String
    },
    data(){
      return {
        theme,
        expand: true
      }
    },
    methods: {
    }
  }
</script>
<style scoped>
  .titlebar{
    margin:5px;
    padding:5px;
    border-radius:5px;
    cursor:pointer;
    display:flex;
    flex-direction:row;
    align-items:center;
    color:v-bind('theme.groupTitle.fontColor');
  }
  .titlebar:hover{
    color:v-bind('theme.groupTitle.hoverFontColor');
    background-color:v-bind('theme.groupTitle.hoverBackgroundColor');
  }
  .title{
    flex:1;
    font-size:20px;
    font-family:v-bind('theme.font')
  }
  .icon{
    width:20px;
    height:20px;
    background-size:100%
  }
  .icon[data-expand="true"]{
    background-image:url('../assets/close-block.png')
  }
  .icon[data-expand="false"]{
    background-image:url('../assets/open-block.png')
  }
</style>
