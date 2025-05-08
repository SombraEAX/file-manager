<template>
  <div class="dirs">
    <div v-for="dir in dirs" class="dir" :class="{selected:dir.pathname === selected}">
      <div class="dir-label">
        <div
          class="dir-icon" 
          :class="dir.open ? 'dir-icon-open' : 'dir-icon-close'"
          @click="iconClick(dir)"
        >
        </div>
        <div class="caption" @click="$emit('select',dir.pathname)">{{dir.caption || dir.name}}</div>
      </div>
      <div class="subtree" v-if="dir.dirs && dir.open">
        <directory-list
          :dirs="dir.dirs" 
          :selected="selected" 
          @select="(ev) => $emit('select',ev)"
        />
      </div>
    </div>
  </div>
</template>
<script>
  import theme from '../../theme.json'

  export default {
    emits: ['select'],
    props: {
      dirs: {
        type: Array,
        default: () => []
      },
      selected:String
    },
    name:'DirectoryList',
    data(){			
      return {
        theme
      }
    },
    methods:{
      iconClick(dir){
        dir.open = !dir.open

        if(dir.open){
          dir.dirs = 
            window.electron
            .readdirSync(dir.pathname)
            .map(subdir => ({
              name: subdir,
              pathname: window.electron.join(dir.pathname, subdir) 	
            }))
            .filter(subdir => window.electron.isDir(subdir.pathname))		
        }else{
          delete dir.dirs
        }
      }
    }
  }
</script>
<style scoped>
  .subtree{
    margin-left:20px
  }
  .dir-icon{
    width:16px;
    height:16px;
    min-width:16px;
    background-size:cover;
  }
  .dir-icon-close{
    background-image:url('../assets/folder.png')
  }
  .dir-icon-open{
    background-image:url('../assets/open-folder.png')		
  }
  .dirs{
    display:flex;
    flex-direction:column
  }
  .dir-label{
    display:flex;
    flex-direction:row;
    cursor:pointer
  }
  .dir{
    display:flex;
    flex-direction:column;
  }
  .caption{
    flex:1;
    margin:auto;
    text-align:left;
    margin-left:5px;
    font-family:v-bind('theme.font');
    white-space: nowrap
  }
  .caption:hover{
    text-decoration:underline;
    color:v-bind('theme.linkHover')
  }
  .dir-icon:hover{
    filter: hue-rotate(90deg);
  }
  .selected>.dir-label>.caption{
    color:v-bind('theme.selected') !important;
    text-decoration:none !important;
    cursor:default !important
  }
</style>
