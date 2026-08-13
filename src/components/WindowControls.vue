<template>
  <div class="window-controls">
    <button class="wc-btn minimize" title="Minimize" @click="minimize">
      <span class="glyph glyph-minimize"></span>
    </button>
    <button class="wc-btn maximize" :title="isMaximized ? 'Restore' : 'Maximize'" @click="toggleMaximize">
      <span class="glyph" :class="isMaximized ? 'glyph-restore' : 'glyph-maximize'"></span>
    </button>
    <button class="wc-btn close" title="Close" @click="close">
      <span class="glyph glyph-close"></span>
    </button>
  </div>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import { theme } from '../stores/theme'

  export default defineComponent({
    name: 'WindowControls',

    data() {
      return {
        theme,
        isMaximized: false,
        _onMaximized: null as ((...args: unknown[]) => void) | null,
      }
    },

    mounted() {
      window.electron.ipcRenderer.invoke('window-controls-is-maximized')
        .then(v => { this.isMaximized = !!v })
        .catch(() => {})
      this._onMaximized = (_event: unknown, value: unknown) => { this.isMaximized = !!value }
      window.electron.ipcRenderer.on('window-maximized-changed', this._onMaximized)
    },

    beforeUnmount() {
      if (this._onMaximized) {
        window.electron.ipcRenderer.removeListener('window-maximized-changed', this._onMaximized)
      }
    },

    methods: {
      minimize() {
        window.electron.ipcRenderer.send('window-controls-minimize')
      },
      toggleMaximize() {
        window.electron.ipcRenderer.send('window-controls-maximize')
      },
      close() {
        window.electron.ipcRenderer.send('window-controls-close')
      }
    }
  })
</script>
<style scoped>
  .window-controls{
    display:flex;
    align-items:stretch;
    margin-left:auto;
    -webkit-app-region:no-drag;
    flex-shrink:0;
    height:100%;
  }
  .wc-btn{
    width:46px;
    min-height:22px;
    height:100%;
    padding:0;
    border:none;
    background:transparent;
    color:v-bind('theme.fontColor');
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:default;
    outline:none;
  }
  .wc-btn:hover{
    background:rgba(128,128,128,0.25);
  }
  .wc-btn.close:hover{
    background:#e81123;
    color:#fff;
  }
  .glyph-minimize{
    width:10px;
    height:1px;
    background:currentColor;
  }
  .glyph-maximize{
    width:10px;
    height:10px;
    border:1px solid currentColor;
  }
  .glyph-restore{
    position:relative;
    width:7px;
    height:7px;
    border:1px solid currentColor;
    margin-top:4px;
    margin-left:4px;
  }
  .glyph-restore::before{
    content:'';
    position:absolute;
    top:-4px;
    left:-4px;
    width:7px;
    height:7px;
    border:1px solid currentColor;
  }
  .glyph-close{
    position:relative;
    width:10px;
    height:10px;
  }
  .glyph-close::before,
  .glyph-close::after{
    content:'';
    position:absolute;
    left:0;
    top:5px;
    width:10px;
    height:1px;
    background:currentColor;
  }
  .glyph-close::before{
    transform:rotate(45deg);
  }
  .glyph-close::after{
    transform:rotate(-45deg);
  }
</style>
