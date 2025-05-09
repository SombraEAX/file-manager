<template>
  <side-bar
    @resize="(ev) => $emit('resize',ev)"
    :width="width"
    minWidth="300"
    position="right"
  >
    <div style="height:100%">

      <!-- image -->
      <div
        v-if="type === 'image'"
        class="image-preview-outer"
      >
        <div
          class="image-preview-inner"
          :style="imageStyle"
        >
        </div>
      </div>

      <!-- plain text -->
      <div
        v-if="type === 'text'"
        class="outer"
      >
        <pre class="inner">{{text}}</pre>
      </div>

      <!-- markdown -->
      <div
        v-if="type === 'markdown'"
        class="outer"
      >
        <div v-html="text" class="inner markdown"></div>
      </div>

      <!-- source -->
      <div
        v-if="type === 'source'"
        class="outer"
      >
        <pre v-html="text" class="inner source"></pre>
      </div>

      <!-- unknown -->
      <div v-if="!type" class="unknown">
        <div>The preview is unavailable</div>
      </div>
    </div>
  </side-bar>
</template>
<script>
  import theme from '../../theme.json'
  import SideBar from './SideBar.vue'
  import {markdown} from 'markdown'
  import hljs from 'highlight.js'
  import 'highlight.js/styles/default.css';

  function getFileType(filename) {
    const filenameLower = filename.toLowerCase();
    const dotIndex = filenameLower.lastIndexOf('.');

    if (dotIndex === -1) return { type: null, language: null }; 

    const extension = filenameLower.substring(dotIndex + 1);

    let type = null;
    let language = null;

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
      case 'svg':
        type = "image";
        break;
      case 'txt':
        type = "text";
        break;
      case 'md':
      case 'markdown':
        type = "markdown";
        break;
      case 'html':
      case 'htm':
        type = "source";
        language = "html"; 
        break;
      case 'js':
        type = "source";
        language = "javascript"; 
        break;
      case 'py':
        type = "source";
        language = "python"; 
        break;
      case 'java':
        type = "source";
        language = "java"; 
        break;
      case 'c':
        type = "source";
        language = "c"; 
        break;
      case 'cpp':
        type = "source";
        language = "cpp"; 
        break;
      case 'cs':
        type = "source";
        language = "csharp"; 
        break;
      case 'go':
        type = "source";
        language = "go"; 
        break;
      case 'rb':
        type = "source";
        language = "ruby"; 
        break;
      case 'php':
        type = "source";
        language = "php"; 
        break;
      case 'ts':
        type = "source";
        language = "typescript"; 
        break;
      default:
        break;
    }

    return { type: type, language: language };
  }

  export default {
    emits: ['resize'],
    props: {
      path: String,
      width: Number
    },
    components: { SideBar },
    data(){			
      return {
        theme,
        text:null,
        type: null,
        imageStyle: null
      }
    },
    watch:{
      async path(path){
        let {type,language} = getFileType(path)

        switch(this.type = type){
          case 'image':{
            let dataUri = await window.electron.getImageDataUri(this.path)
            this.imageStyle = {
              backgroundImage: `url("${dataUri}")`
            }
            break
          }
          case 'text':{
            this.text = await window.electron.readFile(path,'utf-8')            
            break
          }
          case 'markdown':{
            let source = await window.electron.readFile(path,'utf-8')            
          	this.text = markdown.toHTML(source)
          	break
          }
          case 'source':{
            console.log({language})
            let source = await window.electron.readFile(path,'utf-8')            
            this.text = hljs.highlight(source,{language}).value
            break            
          }
        }
        
      }
    }
  }
</script>
<style scoped>
  .image-preview-outer{
  	display:flex;
    width:100%;
    height:100%;
    align-items:stretch  	
  }
  .image-preview-inner{
    flex:1;
    background-repeat:no-repeat;
    background-position:center;
    background-size:contain;
    margin:15px
  }
  .inner{
    box-sizing:border-box;
    padding:10px;
    box-sizing:border-box;
    margin:auto;
    min-height:100%;
    margin-left:0px
  }
  .markdown{
    font-family:sans-serif
  }
  .outer{
    align-content:flex-start;
    position:absolute;
    height:100%;
    width:100%;
    flex:1;
    display: flex;
    overflow:auto
  }  
  .unknown{
    height:100%;
    display:flex    
  }
  .unknown div{
    font-family:sans-serif;
    margin:auto;
    text-align:center;
    padding:10px
  }
</style>
