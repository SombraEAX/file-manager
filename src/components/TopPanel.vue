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
    <input  
      class="address" 
      @keydown.enter="gotopath" 
      @keydown.esc="blur"
      @blur="tmp = address"
      @focus="focus"
      v-model="tmp"
      ref="addressInput"
    />
  </div>
</template>
<script>
  import theme from '../../theme.json'
  
  export default {
    emits: ['back', 'forward', 'up', 'jump', 'changeHistoryIndex'],
    props: {
      address: String,
      history: {
        type: Array,
        default: () => []
      },
      historyIndex: Number
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
      blur(){
        this.$refs.addressInput.blur()
      },
      gotopath(){
        let pathname = this.tmp
        if(pathname !== '/') pathname = pathname.replace(/\/$/,'')
        this.$emit('jump', pathname)
        this.blur()
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
    height:50px;
    border-bottom:1px solid v-bind('theme.borderColor');
    display:flex;
    flex-direction:row;
  }
  .top-panel>*{
    margin:auto 2px;
    padding:0px;
    box-sizing:border-box;
    height:30px
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
  input{
    border:1px solid v-bind('theme.textBoxesBorderColor');
    border-radius:0px;
    margin-right:7px !important;
    padding-left:5px !important
  }
  input:focus {
    outline: none;
    border:1px solid v-bind('theme.textBoxesBorderColorActive');    
  }
  button[disabled]{
    filter: grayscale(1)
  }
</style>
