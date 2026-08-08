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
      ref="addressBar"
      :address="address"
      :search-version="searchVersion"
      :bookmarks="bookmarks"
      :is-bookmarked="isBookmarked"
      @jump="gotopath"
      @search="e => $emit('search', e)"
      @toggle-bookmark="$emit('toggleBookmark')"
    />
    <ZoomButton
      v-if="view === 'icons'"
      ref="zoomButton"
      :scale="scale"
      @scaling="v => $emit('scaling', v)"
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
    <button
      class="icon icon-panel"
      :class="{ active: previewPanelVisible }"
      @click="$emit('togglePreviewPanel')"
    ></button>
    <TasksWidget ref="tasksWidget" />
    <button
      class="icon icon-menu"
      ref="menuButton"
      v-if="!showMenuBar"
      @click="openMenu"
      title="Menu"
    ></button>
  </div>
</template>
<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import theme from '../../theme.json'
  import AddressBar from "./AddressBar.vue"
  import TasksWidget from "./TasksWidget.vue"
  import ZoomButton from "./ZoomButton.vue"

  type AddressBarRef = InstanceType<typeof AddressBar>
  type ZoomButtonRef = InstanceType<typeof ZoomButton>
  type TasksWidgetRef = InstanceType<typeof TasksWidget>

  export default defineComponent({
    emits: ['back', 'forward', 'up', 'jump', 'changeHistoryIndex', 'search', 'changeView', 'togglePreviewPanel', 'openRootMenu', 'toggleBookmark', 'scaling'],
    components:{
      AddressBar,
      TasksWidget,
      ZoomButton
    },
    props: {
      address: String,
      history: {
        type: Array as PropType<string[]>,
        default: () => []
      },
      historyIndex: Number,
      searchVersion: Number,
      view: String,
      scale: Number,
      previewPanelVisible: Boolean,
      showMenuBar: Boolean,
      bookmarks: {
        type: Array as PropType<string[]>,
        default: () => []
      },
      isBookmarked: Boolean
    },
    data(){
      return {
        theme,
        tmp: ''
      }
    },
    methods: {
      gotopath(pathname: string){
        if(pathname !== '/' && pathname !== 'trash://') pathname = pathname.replace(/\/$/,'')
        this.$emit('jump', pathname)
      },
      showHistory(){
        const { ipcRenderer } = window.electron
        const rect = (this.$refs.historyButton as HTMLElement).getBoundingClientRect()

        ipcRenderer.send('show-history-menu', {
          history: [...this.history], 
          current: this.historyIndex || 0, 
          x:       rect.x, 
          y:       rect.y + rect.height
        })

        ipcRenderer.once(
          'show-history-menu-reply',
          (_, index) => this.$emit('changeHistoryIndex', index)
        )
      },
      openMenu(){
        const rect = (this.$refs.menuButton as HTMLElement).getBoundingClientRect()
        this.$emit('openRootMenu', rect.x, rect.y + rect.height)
      },
      closeDropdowns(){
        const ab = this.$refs.addressBar as AddressBarRef | undefined
        if(ab){
          ab.closeDropdown()
          ab.finishEditing()
        }
        const zoom = this.$refs.zoomButton as ZoomButtonRef | undefined
        if(zoom) zoom.closePopup()
        const tw = this.$refs.tasksWidget as TasksWidgetRef | undefined
        if(this.$attrs.autohideTopPanel && tw) tw.closePopup()
      }
    },
    watch: {
      address(){
        this.tmp = this.address || ''
      }
    }
  })
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
    background-color:transparent;
    border:0px;
    color:v-bind('theme.topPanelIconColor')
  }
  button:not(.icon){
    height:30px;
  }
  button:hover{
    color:v-bind('theme.topPanelIconHoverColor')
  }
  .history{
    width:16px;
    margin-left:0px
  }
  .back{
    margin-right:0px;
  }
  .back::before,
  .forward::before,
  .up::before,
  .history::before,
  .top-panel .icon::before{
    font-family:PureNerdFont,"Symbols Nerd Font Mono","Noto Sans Nerd Font","Meslo Nerd Font","FiraCode Nerd Font",sans-serif;
    font-size:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%
  }
  .back::before{ content:"\f053" }
  .forward::before{ content:"\f054" }
  .up::before{ content:"\f077" }
  .history::before{ content:"\f0d7" }
  button[disabled]{
    filter: grayscale(1)
  }
  .top-panel .icon{
    width:30px;
    height:30px;
    border:0px;
    outline:0;
    background-color:transparent;
    margin:0 2px;
    box-sizing:content-box;
  }
  .top-panel .icon-list::before{ content:"" }
  .top-panel .icon-table::before{ content:"" }
  .top-panel .icon-icons::before{ content:"󰀻" }
  .top-panel .icon-panel::before{ content:"\ebf4" }
  .top-panel .icon-menu::before{ content:"\f0c9" }
  .top-panel .icon.active{
    color:v-bind('theme.topPanelIconHoverColor')
  }
  .top-panel .icon:not(.active){
    cursor:pointer;
  }
</style>
