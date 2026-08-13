<template>
  <transition name="open-with-fade">
    <div class="open-with-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="open-with-popup">
        <div class="open-with-title">Open with…</div>
        <div class="open-with-file">{{ fileName }}</div>
        <div class="open-with-mime" v-if="mimeType">{{ mimeType }}</div>
        <div class="open-with-body">
          <div v-if="loading" class="open-with-empty">Loading applications…</div>
          <div v-else-if="error" class="open-with-error">{{ error }}</div>
          <div v-else-if="!apps.length" class="open-with-empty">No applications found.</div>
          <template v-else>
            <button
              v-for="app in apps"
              :key="app.id"
              class="open-with-app"
              @click="launch(app)"
            >
              <img
                v-if="app.icon"
                class="open-with-app-icon"
                :src="app.icon"
                alt=""
              />
              <span v-else class="open-with-app-icon open-with-app-icon-placeholder"></span>
              <span class="open-with-app-name">{{ app.name }}</span>
              <span v-if="app.isDefault" class="open-with-default">Default</span>
            </button>
          </template>
        </div>
        <div class="open-with-actions">
          <button class="open-with-btn cancel" @click="$emit('close')">Cancel</button>
        </div>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
  import { defineComponent } from 'vue'
  import type { OpenWithApp } from '../types/ipc'
  import { theme } from '../stores/theme'

  export default defineComponent({
    name: 'OpenWithPopup',

    props: {
      path: { type: String, default: '' },
      visible: Boolean
    },

    emits: ['close'],

    data() {
      return {
        theme,
        apps: [] as OpenWithApp[],
        mimeType: '',
        loading: false,
        error: ''
      }
    },

    computed: {
      fileName(): string {
        return this.path.split('/').pop() || ''
      }
    },

    watch: {
      visible(val) {
        if (val) this.load()
      },
      path() {
        if (this.visible) this.load()
      }
    },

    methods: {
      async load() {
        if (!this.path) return
        this.loading = true
        this.error = ''
        try {
          const res = await window.electron.openWithList(this.path)
          this.apps = res.apps
          this.mimeType = res.mimeType
        } catch (e) {
          this.error = (e as Error).message || String(e)
        } finally {
          this.loading = false
        }
      },

      async launch(app: OpenWithApp) {
        this.error = ''
        try {
          const { error } = await window.electron.openWith(this.path, app.exec)
          if (error) {
            this.error = error
          } else {
            this.$emit('close')
          }
        } catch (e) {
          this.error = (e as Error).message || String(e)
        }
      }
    }
  })
</script>
<style scoped>
  .open-with-overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.3);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:10000;
  }
  .open-with-popup{
    background: v-bind('theme.dropDown.background');
    border:1px solid v-bind('theme.dropDown.borderColor');
    border-radius:8px;
    padding:20px 24px;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    min-width:360px;
    max-width:460px;
  }
  .open-with-title{
    font-family:v-bind('theme.font');
    font-size:16px;
    font-weight:bold;
    color:v-bind('theme.fontColor');
    margin-bottom:4px;
  }
  .open-with-file{
    font-family:v-bind('theme.font');
    font-size:13px;
    color:v-bind('theme.fontColor');
    word-break:break-all;
  }
  .open-with-mime{
    font-family:v-bind('theme.font');
    font-size:12px;
    color:v-bind('theme.dropDown.textColor');
    opacity:0.7;
    margin:2px 0 12px;
  }
  .open-with-body{
    margin-bottom:16px;
    max-height:300px;
    overflow-y:auto;
    display:flex;
    flex-direction:column;
    gap:4px;
  }
  .open-with-empty{
    font-family:v-bind('theme.font');
    font-size:13px;
    color:v-bind('theme.dropDown.textColor');
    padding:8px 0;
  }
  .open-with-error{
    font-family:v-bind('theme.font');
    font-size:13px;
    color:#e57373;
    padding:8px 0;
    word-break:break-all;
  }
  .open-with-app{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    width:100%;
    text-align:left;
    padding:7px 10px;
    border:none;
    border-radius:4px;
    background:transparent;
    color:v-bind('theme.fontColor');
    font-family:v-bind('theme.font');
    font-size:13px;
    cursor:pointer;
  }
  .open-with-app:hover{
    background:v-bind('theme.dropDown.itemHoverBackground');
  }
  .open-with-app-icon{
    flex-shrink:0;
    width:20px;
    height:20px;
    object-fit:contain;
    border-radius:3px;
  }
  .open-with-app-icon-placeholder{
    background:v-bind('theme.dropDown.itemHoverBackground');
  }
  .open-with-app-name{
    flex:1;
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .open-with-default{
    flex-shrink:0;
    font-size:11px;
    padding:1px 6px;
    border-radius:3px;
    background:v-bind('theme.menu.accentColor');
    color:#fff;
  }
  .open-with-actions{
    display:flex;
    justify-content:flex-end;
    gap:8px;
  }
  .open-with-btn{
    font-family:v-bind('theme.font');
    font-size:13px;
    padding:5px 14px;
    border-radius:4px;
    border:1px solid v-bind('theme.dropDown.borderColor');
    cursor:pointer;
    background:v-bind('theme.dropDown.background');
    color:v-bind('theme.fontColor');
  }
  .open-with-btn.cancel:hover{
    background:v-bind('theme.dropDown.itemHoverBackground');
  }
  .open-with-fade-enter-active, .open-with-fade-leave-active{
    transition:opacity .2s;
  }
  .open-with-fade-enter-from, .open-with-fade-leave-to{
    opacity:0;
  }
</style>
