<template>
  <div class="top-panel">
    <button
      class="back"    
      @click="$emit('back')" 
      :disabled="!historyIndex"
    ></button>
    <button
      class="history"
      ref="historyButton"
      @click="showHistory"
    ></button>
    <button
      class="forward"
      @click="$emit('forward')"
      :disabled="historyIndex == history.length - 1"
    ></button>
    <button
      class="up"      
      @click="$emit('up')"
      :disabled="address == '/'"
    ></button>
    <AddressBar
      :address="address"
      :search-version="searchVersion"
      @jump="gotopath"
      @search="e => $emit('search', e)"
    />
    <button
      class="icon icon-list"
      :class="{ active: view === 'list' }"
      @click="$emit('changeView', 'list')"
    ></button>
    <button
      class="icon icon-icons"
      :class="{ active: view === 'icons' }"
      @click="$emit('changeView', 'icons')"
    ></button>
    <button
      class="icon icon-table"
      :class="{ active: view === 'table' }"
      @click="$emit('changeView', 'table')"
    ></button>
  </div>
</template>
<script>
  import theme from '../../theme.json'
  import AddressBar from "./AddressBar.vue"
  
  export default {
    emits: ['back', 'forward', 'up', 'jump', 'changeHistoryIndex', 'search', 'changeView'],
    components:{
      AddressBar
    },
    props: {
      address: String,
      history: {
        type: Array,
        default: () => []
      },
      historyIndex: Number,
      searchVersion: Number,
      view: String
    },
    data(){
      return {
        theme,
        tmp: '',
        focus: false
      }
    },
    methods: {
      focus(){
        this.$refs.addressInput.select()
      },
      gotopath(pathname){
        if(pathname !== '/') pathname = pathname.replace(/\/$/,'')
        this.$emit('jump', pathname)
      },
      showHistory(){
        let { ipcRenderer } = window.electron
        let rect = this.$refs.historyButton.getBoundingClientRect()

        ipcRenderer.send('show-history-menu', {
          history: [...this.history], 
          current: this.historyIndex, 
          x:       rect.x, 
          y:       rect.y + rect.height
        })

        ipcRenderer.once(
          'show-history-menu-reply',
          (_, index) => this.$emit('changeHistoryIndex', index)
        )
      }
    },
    watch: {
      address(){
        this.tmp = this.address
      }
    }
  }
</script>
<style scoped>
  .top-panel{
    height:40px;
    display:flex;
    flex-direction:row;
    align-items: flex-end;
  }
  .top-panel>*{
    margin:0 2px;
    padding:0px;
    box-sizing:border-box;
  }
  .address{
    flex:1
  }
  button{
    cursor:pointer;
    width:30px;
    background-position:center;
    background-repeat:no-repeat;
    background-size:50%;
    background-color:transparent;
    border:0px;
  }
  button:not(.icon){
    height:30px;
  }
  button:hover{
    filter: hue-rotate(90deg);
  }
  .history{
    width:16px;
    margin-left:0px
  }
  .back{
    margin-right:0px;
    background-image:url("../assets/left-arrow.png")
  }
  .forward{
    background-image:url("../assets/right-arrow.png")
  }
  .up{
    background-image:url("../assets/up-arrow.png")
  }
  .history{
    background-image:url("../assets/caret-down.png")    
  }
  button[disabled]{
    filter: grayscale(1)
  }
  .top-panel .icon{
    width:30px;
    height:30px;
    background-position:center;
    background-size:50%;
    background-repeat:no-repeat;
    border:0px;
    outline:0;
    background-color:transparent;
    margin:0 2px;
    box-sizing:content-box;
  }
  .top-panel .icon-list{
    background-image:url("../assets/list.png")
  }
  .top-panel .icon-table{
    background-image:url("../assets/table.png")
  }
  .top-panel .icon-icons{
    background-image:url("../assets/icons.png")
  }
  .top-panel .icon.active{
    filter: hue-rotate(90deg);
  }
  .top-panel .icon:not(.active){
    cursor:pointer;
  }
</style>
