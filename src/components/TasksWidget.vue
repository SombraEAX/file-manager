<template>
  <div class="wrapper" v-if="displayTasks.length">
    <button
      class="widget-button"
      :class="{ active: open }"
      @click="open = !open"
    >
      <template v-if="allFinished">
        <span v-if="hasErrors" class="checkmark warning">⚠</span>
        <span v-else class="checkmark">✔</span>
      </template>
      <template v-else>
        <span class="eta">{{ eta }}</span>
        <span class="bar-wrap"><span class="bar" :style="{ width: overallProgress + '%' }"></span></span>
      </template>
    </button>
    <Teleport to="body">
      <div class="popup" v-if="open" ref="popup" :style="popupStyle">
        <div class="arrow"></div>
        <div class="popup-inner">
            <div class="task-list" ref="taskList" :class="{ 'has-overflow': hasOverflow }">
            <div class="task" v-for="task in displayTasks" :key="task.id">
              <div class="task-icon" :class="'op-' + (task.data && task.data.operation || 'default')">
                <span v-html="taskIcon(task)"></span>
              </div>
              <div class="task-main">
                <div class="task-header">
                    <span class="task-name">{{ task.name }}<span class="task-size" v-if="task.totalSize">{{ formatSize(task.totalSize) }}</span></span>
                  <span class="task-pct" v-if="!isFinished(task) && task.status !== 'cancelled'">{{ Math.round(task.progress) }}%</span>
                </div>
                <template v-if="!isFinished(task) && task.status !== 'cancelled'">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
                  </div>
                  <div class="task-footer">
                    <span v-if="task.from" class="task-status" :data-status="task.status">
                      <span class="status-static">From</span>
                      <span class="status-path">{{ task.from }}</span>
                      <template v-if="task.to">
                        <span class="status-static">to</span>
                        <span class="status-path">{{ task.to }}</span>
                      </template>
                    </span>
                    <span v-else class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
                  </div>
                </template>
                <template v-else-if="task.status !== 'cancelled'">
                  <div class="progress-track progress-track-done"></div>
                  <div class="task-footer">
                    <span class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="progress-track progress-track-done"></div>
                  <div class="task-footer">
                    <span class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
                  </div>
                </template>
              </div>
              <div class="task-speed-block">
                <span class="task-speed">{{ taskSpeed(task) }}</span>
                <span class="task-time" v-if="task.status === 'active'">{{ formatTime(task.timeRemaining) }}</span>
              </div>
              <div class="task-actions" v-if="task.status !== 'cancelled'">
                <button
                  v-if="task.status === 'done'"
                  class="action-btn action-folder"
                  title="Show in folder"
                  @click="open = false; emit('task-open-folder', task)"
                >&#xf07b;</button>
                <button
                  v-if="task.status === 'active'"
                  class="action-btn action-cancel"
                  title="Cancel"
                  @click="emit('task-cancel', task.id)"
                >&#xf073a;</button>
                <button
                  v-if="task.status === 'error'"
                  class="action-btn action-retry"
                  title="Retry"
                  @click="emit('task-retry', task)"
                >&#xf021;</button>
                <button
                  v-if="task.status === 'done'"
                  class="action-btn action-undo"
                  title="Undo"
                  @click="emit('task-undo', task)"
                >&#xf0e2;</button>
              </div>
            </div>
          </div>
          <div class="popup-footer">
            <span class="stats-text">
              Tasks: {{ stats.total }}, completed: {{ stats.done }}, active: {{ stats.active }}, error: {{ stats.error }}, canceled: {{ stats.cancelled }}
            </span>
            <button class="hide-btn" @click="hideInactive = !hideInactive">
              {{ hideInactive ? 'Show inactive tasks' : 'Hide inactive tasks' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import theme from '../../theme.json'
import { tasks, removeTask, formatTime } from '../stores/tasks'
import { emit } from '../stores/events'

const MOCK_TASKS = [
  { id: 1, name: 'Copying very long documents folder with nested subdirectories to backup drive…', progress: 72, status: 'active', timeRemaining: 35, startedAt: Date.now() - 120000, speed: '12.4 MB/s', totalSize: 1572864000, from: '/home/user/Projects/file-manager/src/components/very-long-folder-name', to: '/mnt/backup/2024-archives/important-documents', data: { operation: 'copy' } },
  { id: 2, name: 'Moving photos to archive folder…', progress: 100, status: 'done', timeRemaining: 0, startedAt: Date.now() - 300000, speed: '8.2 MB/s', totalSize: 5368709120, from: '/home/user/Photos', to: '/mnt/archive/Photos', data: { operation: 'move' } },
  { id: 3, name: 'Deleting old cache files…', progress: 100, status: 'done', timeRemaining: 0, startedAt: Date.now() - 250000, speed: '45.0 MB/s', totalSize: 268435456, from: '/home/user/.cache', to: '', data: { operation: 'trash' } },
  { id: 4, name: 'Renaming project folders…', progress: 100, status: 'error', timeRemaining: 0, startedAt: Date.now() - 200000, speed: '', totalSize: 0, from: '/home/user/projects', to: '', data: {} },
  { id: 5, name: 'Compressing logs directory…', progress: 100, status: 'done', timeRemaining: 0, startedAt: Date.now() - 180000, speed: '3.1 MB/s', totalSize: 1073741824, from: '/var/log', to: '/tmp/logs.tar.gz', data: { operation: 'trash' } },
  { id: 6, name: 'Syncing workspace to remote…', progress: 45, status: 'active', timeRemaining: 60, startedAt: Date.now() - 90000, speed: '2.8 MB/s', totalSize: 2147483648, from: '/home/user/workspace/another-very-long-path-that-keeps-going', to: 'remote-server.example.com:/data/backups/2024/workspace-sync', data: { operation: 'copy' } },
  { id: 8, name: 'Moving config files…', progress: 30, status: 'active', timeRemaining: 5, startedAt: Date.now() - 10000, speed: '1.2 MB/s', totalSize: 4096, from: '/etc', to: '/tmp/bak', data: { operation: 'move' } },
  { id: 7, name: 'Extracting downloaded archives…', progress: 100, status: 'cancelled', timeRemaining: 0, startedAt: Date.now() - 150000, speed: '', totalSize: 734003200, from: '/home/user/Downloads/extracted-with-a-very-long-folder-name', to: '/home/user/Extracted/destination-folder', data: {} },
]

export default {
  data() {
    return {
      open: false,
      theme,
      hideInactive: false,
      useMock: false,
      scrollbarWidth: 17,
      hasOverflow: false,
      _tick: 0,
    }
  },
  watch: {
    open(val) { if (val) this.checkOverflow() },
    displayTasks() { this.checkOverflow() },
  },
  computed: {
    displayTasks() {
      if (this.useMock) {
        if (this.hideInactive) {
          return MOCK_TASKS.filter(t => t.status === 'active')
        }
        return MOCK_TASKS
      }
      if (this.hideInactive) {
        return tasks.filter(t => t.status === 'active')
      }
      return tasks
    },
    allFinished() {
      return this.displayTasks.length > 0 && this.displayTasks.every(t => t.status === 'done' || t.status === 'error' || t.status === 'cancelled')
    },
    hasErrors() {
      return this.displayTasks.some(t => t.status === 'error')
    },
    activeTasks() {
      return this.displayTasks.filter(t => t.status === 'active')
    },
    overallProgress() {
      const active = this.activeTasks
      if (!active.length) return 0
      return active.reduce((s, t) => s + t.progress, 0) / active.length
    },
    eta() {
      const times = this.activeTasks.filter(t => t.timeRemaining != null).map(t => t.timeRemaining)
      if (!times.length) return ''
      return formatTime(Math.min(...times))
    },
    stats() {
      const all = this.useMock ? MOCK_TASKS : tasks
      return {
        total: all.length,
        done: all.filter(t => t.status === 'done').length,
        active: all.filter(t => t.status === 'active').length,
        error: all.filter(t => t.status === 'error').length,
        cancelled: all.filter(t => t.status === 'cancelled').length,
      }
    },
    popupStyle() {
      if (!this.$el) return {}
      let rect = this.$el.getBoundingClientRect()
      return {
        position: 'fixed',
        top: (rect.bottom + 6) + 'px',
        right: (window.innerWidth - rect.right) + 'px'
      }
    }
  },
  methods: {
    formatTime,
    formatSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return '(' + bytes + ' B)'
      if (bytes < 1048576) return '(' + (bytes / 1024).toFixed(1) + ' KB)'
      if (bytes < 1073741824) return '(' + (bytes / 1048576).toFixed(1) + ' MB)'
      return '(' + (bytes / 1073741824).toFixed(1) + ' GB)'
    },
    emit,
    isFinished(task) {
      return task.status === 'done' || task.status === 'error'
    },
    taskIcon(task) {
      const op = task.data && task.data.operation
      switch(op) {
        case 'copy': return '&#xf0c5;'
        case 'move': return '&#xf0ab9;'
        case 'trash': return '&#xf1f8;'
        case 'trash-delete': return '&#xf1f8;'
        case 'trash-restore': return '&#xf0e2;'
        case 'rename': return '&#xf044;'
        default: return '&#xf019;'
      }
    },
    taskSpeed(task) {
      void this._tick
      if (task.status !== 'active') return ''
      if (!task.progress || !task.startedAt) return '…'
      const elapsed = (Date.now() - task.startedAt) / 1000
      if (elapsed < 1) return '…'
      const rate = task.progress / elapsed
      if (rate <= 0) return '…'
      const bytesPerSec = (task.totalSize || 0) * rate / 100
      if (bytesPerSec <= 0) return '…'
      if (bytesPerSec < 1024) return Math.round(bytesPerSec) + ' B/s'
      if (bytesPerSec < 1048576) return (bytesPerSec / 1024).toFixed(1) + ' KB/s'
      if (bytesPerSec < 1073741824) return (bytesPerSec / 1048576).toFixed(1) + ' MB/s'
      return (bytesPerSec / 1073741824).toFixed(1) + ' GB/s'
    },
    statusLabel(task) {
      switch(task.status) {
        case 'active': return 'In progress'
        case 'paused': return 'Paused'
        case 'done': return 'Completed'
        case 'error': return 'Error'
        case 'cancelled': return 'Cancelled'
        default: return task.status
      }
    },
    closePopup() {
      this.open = false
    },
    checkOverflow() {
      this.$nextTick(() => {
        const el = this.$refs.taskList
        if (el) this.hasOverflow = el.scrollHeight > el.clientHeight
      })
    },
    measureScrollbar() {
      const el = document.createElement('div')
      el.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;'
      document.body.appendChild(el)
      this.scrollbarWidth = el.offsetWidth - el.clientWidth
      document.body.removeChild(el)
    },
    onClickOutside(e) {
      if (!this.$el.contains(e.target) && !(this.$refs.popup && this.$refs.popup.contains(e.target))) {
        this.open = false
      }
    }
  },
  mounted() {
    this.measureScrollbar()
    this._timer = setInterval(() => { this._tick++ }, 1000)
    document.addEventListener('click', this.onClickOutside)
  },
  beforeUnmount() {
    clearInterval(this._timer)
    document.removeEventListener('click', this.onClickOutside)
  }
}
</script>

<style scoped>
.wrapper {
  position: relative;
  margin: 0 2px;
}
.widget-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  height: 30px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: v-bind('theme.topPanelIconColor');
  border-radius: 3px;
  box-sizing: border-box;
}
.widget-button:hover,
.widget-button.active {
  background: transparent;
  color: v-bind('theme.topPanelIconHoverColor');
}
.bar-wrap {
  width: 16px;
  height: 3px;
  background: rgba(128,128,128,0.25);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}
.bar {
  height: 100%;
  display: block;
  background: v-bind('theme.searchMode.progressColor');
  border-radius: 2px;
  transition: width 0.3s;
}
.eta {
  font-size: 11px;
  font-family: v-bind('theme.font');
  white-space: nowrap;
  min-width: 20px;
  text-align: center;
}
.checkmark {
  font-size: 14px;
  line-height: 1;
  color: v-bind('theme.topPanelIconColor');
}
.widget-button:hover .checkmark,
.widget-button.active .checkmark {
  color: v-bind('theme.topPanelIconHoverColor');
}
.checkmark.warning {
  color: v-bind('theme.topPanelIconColor');
}
.popup {
  z-index: 9999;
  width: 520px;
}
.arrow {
  position: absolute;
  top: -5px;
  right: 10px;
  width: 14px;
  height: 6px;
}
.arrow::before,
.arrow::after {
  content: '';
  position: absolute;
}
.arrow::before {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: v-bind('theme.dropDown.borderColor');
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
.arrow::after {
  top: 1px;
  left: 1px;
  width: 12px;
  height: 5px;
  background: v-bind('theme.dropDown.background');
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  filter: drop-shadow(0 -1px 1px rgba(0,0,0,0.1));
}
.popup-inner {
  font-family: sans-serif;
  background: v-bind('theme.dropDown.background');
  border: 1px solid v-bind('theme.dropDown.borderColor');
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.task-list {
  max-height: 340px;
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: none;
}
.task-list.has-overflow {
  padding-right: var(--sb-w, 17px);
}
.task-list::-webkit-scrollbar {
  display: none;
}
.popup-inner:hover .task-list {
  scrollbar-width: auto;
  padding-right: 0;
}
.popup-inner:hover .task-list::-webkit-scrollbar {
  display: block;
}
.task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  height: 56px;
  box-sizing: border-box;
}
.task:last-child {
  border-bottom: none;
}
.task-main {
  flex: 1;
  min-width: 0;
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.task-name {
  font-size: 13px;
  font-family: v-bind('theme.font');
  color: v-bind('theme.fontColor');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}
.task-size {
  font-size: 11px;
  color: v-bind('theme.tableRow.params');
  font-weight: normal;
  margin-left: 4px;
}
.task-pct {
  font-size: 12px;
  color: v-bind('theme.tableRow.params');
  flex-shrink: 0;
}
.progress-track {
  height: 6px;
  background: rgba(128,128,128,0.15);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.progress-track-done {
  background: transparent;
  visibility: hidden;
}
.progress-fill {
  height: 100%;
  background: v-bind('theme.searchMode.progressColor');
  border-radius: 3px;
  transition: width 0.3s;
}
.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}
.task-status {
  font-size: 11px;
  color: v-bind('theme.tableRow.params');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.status-static {
  flex-shrink: 0;
  white-space: nowrap;
}
.status-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.task-status[data-status="done"] {
  color: v-bind('theme.searchMode.progressColor');
}
.task-status[data-status="error"] {
  color: #e74c3c;
}
.task-eta {
  font-size: 11px;
  color: v-bind('theme.tableRow.params');
}
.task-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  flex-shrink: 0;
  font-family: PureNerdFont, "Symbols Nerd Font Mono", "Noto Sans Nerd Font", "Meslo Nerd Font", "FiraCode Nerd Font", sans-serif;
  font-size: 14px;
}
.op-copy {
  background: rgba(52, 152, 219, 0.12);
  color: #3498db;
}
.op-move {
  background: rgba(155, 89, 182, 0.12);
  color: #9b59b6;
}
.op-trash,
.op-trash-delete {
  background: rgba(231, 76, 60, 0.12);
  color: #e74c3c;
}
.op-trash-restore {
  background: rgba(46, 204, 113, 0.12);
  color: #27ae60;
}
.op-rename {
  background: rgba(241, 196, 15, 0.12);
  color: #f1c40f;
}
.op-default {
  background: rgba(128, 128, 128, 0.12);
  color: #888;
}
.task-speed-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 70px;
  flex-shrink: 0;
  gap: 1px;
}
.task-speed {
  font-size: 12px;
  font-family: v-bind('theme.font');
  font-weight: 600;
  color: v-bind('theme.fontColor');
  white-space: nowrap;
  line-height: 1.2;
}
.task-time {
  font-size: 10px;
  color: v-bind('theme.tableRow.params');
  white-space: nowrap;
  line-height: 1.2;
}
.task-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-family: PureNerdFont, "Symbols Nerd Font Mono", "Noto Sans Nerd Font", "Meslo Nerd Font", "FiraCode Nerd Font", sans-serif;
  font-size: 13px;
  line-height: 1;
}
.action-cancel {
  color: #e74c3c;
}
.action-cancel:hover {
  background: rgba(231, 76, 60, 0.15);
}
.action-retry {
  color: #e67e22;
}
.action-retry:hover {
  background: rgba(230, 126, 34, 0.15);
}
.action-undo {
  color: #3498db;
}
.action-undo:hover {
  background: rgba(52, 152, 219, 0.15);
}
.action-folder {
  color: #27ae60;
}
.action-folder:hover {
  background: rgba(39, 174, 96, 0.15);
}
.popup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}
.stats-text {
  font-size: 11px;
  font-family: v-bind('theme.font');
  color: v-bind('theme.tableRow.params');
  white-space: nowrap;
}
.hide-btn {
  font-size: 11px;
  font-family: v-bind('theme.font');
  color: v-bind('theme.fontColor');
  background: transparent;
  border: 1px solid rgba(128,128,128,0.3);
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 12px;
}
.hide-btn:hover {
  background: rgba(128,128,128,0.1);
  border-color: rgba(128,128,128,0.5);
}
</style>
