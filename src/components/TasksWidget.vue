<template>
  <div class="wrapper" v-if="hasTasks">
    <button
      class="widget-button"
      :class="{ active: open }"
      @click="open = !open"
    >
      <template v-if="allFinished">
        <span v-if="hasErrors" class="checkmark warning">&#9888;</span>
        <span v-else class="checkmark">&#10004;</span>
      </template>
      <template v-else>
        <span class="eta">{{ eta }}</span>
        <span class="bar-wrap"><span class="bar" :style="{ width: overallProgress + '%' }"></span></span>
      </template>
    </button>
      <div class="popup" v-if="open" ref="popup">
        <div class="arrow"></div>
        <div class="popup-inner">
            <div class="task-list" ref="taskList">
            <div class="task" v-for="task in displayTasks" :key="task.id">
              <div class="task-icon" :class="'op-' + (task.data && task.data.operation || 'default')">
                <span v-html="taskIcon(task)"></span>
              </div>
              <div class="task-main">
                <div class="task-header">
                    <span class="task-name-wrap"><span class="task-name" :title="task.name">{{ task.name }}</span><span class="task-size" v-if="task.totalSize">{{ formatSize(task.totalSize) }}</span></span>
                  <span class="task-pct" v-if="!isFinished(task)">{{ Math.round(task.progress) }}%</span>
                </div>
                <div v-if="!isFinished(task)" class="progress-track">
                  <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
                </div>
                <div v-else class="progress-track progress-track-done"></div>
                <div class="task-footer">
                  <span v-if="!isFinished(task) && task.status !== 'paused' && task.data && task.data.operation" class="task-status" :data-status="task.status">
                    <template v-if="task.data.operation === 'copy' || task.data.operation === 'move'">
                      <span class="status-static">From</span>
                      <span class="status-path" :title="task.from">{{ task.from }}</span>
                      <template v-if="task.to">
                        <span class="status-static">to</span>
                        <span class="status-path" :title="task.to">{{ task.to }}</span>
                      </template>
                    </template>
                    <template v-else-if="task.data.operation === 'trash'">
                      <span class="status-static">From</span>
                      <span class="status-path" :title="task.from">{{ task.from }}</span>
                    </template>
                    <template v-else-if="task.data.operation === 'trash-restore'">
                      <span class="status-static">To</span>
                      <span class="status-path" :title="task.to">{{ task.to }}</span>
                    </template>
                    <template v-else>
                      {{ statusLabel(task) }}
                    </template>
                  </span>
                  <span v-else class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
                </div>
              </div>
              <div class="task-speed-block" v-if="task.status === 'active' || task.status === 'paused' || task.status === 'counting' || task.status === 'cancelling'">
                <span class="task-speed" v-if="task.status !== 'paused'">{{ taskSpeed(task) }}</span>
                <span class="task-time" v-if="task.status === 'active'">{{ formatTime(task.timeRemaining) }}</span>
              </div>
              <div class="task-actions" :class="{ 'actions-4': task.status === 'partial' && canUndo(task) }">
                <template v-if="task.status === 'active'">
                  <button class="action-btn action-cancel" title="Cancel" @click="emit('task-cancel', task.id)">&#xf073a;</button>
                  <button class="action-btn action-pause" title="Pause" @click="emit('task-pause', task.id)">&#xf04c;</button>
                </template>
                <template v-else-if="task.status === 'paused'">
                  <button class="action-btn action-cancel" title="Cancel" @click="emit('task-cancel', task.id)">&#xf073a;</button>
                  <button class="action-btn action-resume" title="Resume" @click="emit('task-resume', task.id)">&#xf04b;</button>
                </template>
                <template v-else-if="task.status === 'counting'">
                  <button class="action-btn action-cancel" title="Cancel" @click="emit('task-cancel', task.id)">&#xf073a;</button>
                </template>
                <template v-else-if="task.status === 'cancelling'">
                </template>
                <template v-else-if="task.status === 'done'">
                  <button class="action-btn action-folder" title="Show in folder" @click="open = false; emit('task-open-folder', task)">&#xf07b;</button>
                  <button v-if="canUndo(task)" class="action-btn action-undo" title="Undo" @click="emit('task-undo', task)">&#xf0e2;</button>
                </template>
                <template v-else-if="task.status === 'error'">
                  <button class="action-btn action-folder" title="Show in folder" @click="open = false; emit('task-open-folder', task)">&#xf07b;</button>
                  <button class="action-btn action-retry" title="Retry" @click="emit('task-retry', task)">&#xf021;</button>
                </template>
                <template v-else-if="task.status === 'cancelled'">
                  <button class="action-btn action-folder" title="Show in folder" @click="open = false; emit('task-open-folder', task)">&#xf07b;</button>
                </template>
                <template v-else-if="task.status === 'undone'">
                  <button class="action-btn action-folder" title="Show in folder" @click="open = false; emit('task-open-folder', task)">&#xf07b;</button>
                </template>
                <template v-else-if="task.status === 'partial'">
                  <button class="action-btn action-folder" title="Show in folder" @click="open = false; emit('task-open-folder', task)">&#xf07b;</button>
                  <button v-if="canUndo(task)" class="action-btn action-undo" title="Undo" @click="emit('task-undo', task)">&#xf0e2;</button>
                  <button class="action-btn action-retry-failed" title="Retry failed files" @click="emit('task-retry-failed', task)">&#xf021;</button>
                  <button class="action-btn action-info" title="Info" @click="showInfo(task)">&#xf129;</button>
                </template>
              </div>
            </div>
            <div v-if="hideInactive && !displayTasks.length" class="empty-msg">No active tasks</div>
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
      <div class="info-popup-overlay" v-if="infoTask" @click.self="infoTask = null">
        <div class="info-popup">
          <div class="info-header">
            <span class="info-title">Error log — {{ infoTask.name }}</span>
            <button class="info-close" @click="infoTask = null">&#xf00d;</button>
          </div>
          <div class="info-log">
            <div v-for="(entry, i) in (infoTask.data && infoTask.data.errorLog || [])" :key="i" class="log-entry">{{ entry }}</div>
            <div v-if="!(infoTask.data && infoTask.data.errorLog && infoTask.data.errorLog.length)" class="log-empty">No errors logged</div>
          </div>
        </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { Task } from '../stores/tasks'
import theme from '../../theme.json'
import { tasks, formatTime } from '../stores/tasks'
import { emit } from '../stores/events'

export default defineComponent({
  data() {
    return {
      open: false,
      theme,
      hideInactive: false,
      infoTask: null as Task | null,
    }
  },
  computed: {
    displayTasks() {
      if (this.hideInactive) {
        return tasks.filter(t => t.status === 'active')
      }
      return tasks
    },
    hasTasks() {
      return tasks.length > 0
    },
    allFinished() {
      return this.displayTasks.every(t => t.status === 'done' || t.status === 'error' || t.status === 'cancelled' || t.status === 'partial' || t.status === 'undone')
    },
    hasErrors() {
      return this.displayTasks.some(t => t.status === 'error')
    },
    activeTasks() {
      return this.displayTasks.filter(t => t.status === 'active')
    },
    overallProgress() {
      const inFlight = this.displayTasks.filter(t => !this.isFinished(t))
      if (!inFlight.length) return 0
      return inFlight.reduce((s, t) => s + (t.progress || 0), 0) / inFlight.length
    },
    eta(): string {
      const times = this.activeTasks.map(t => t.timeRemaining).filter((t): t is number => t != null)
      if (!times.length) return ''
      return formatTime(Math.min(...times))
    },
    stats() {
      const all = tasks
      return {
        total: all.length,
        done: all.filter(t => t.status === 'done').length,
        active: all.filter(t => t.status === 'active').length,
        error: all.filter(t => t.status === 'error').length,
        cancelled: all.filter(t => t.status === 'cancelled').length,
        undone: all.filter(t => t.status === 'undone').length,
      }
    },
  },
  methods: {
    formatTime,
    formatSize(bytes?: number): string {
      if (!bytes) return ''
      if (bytes < 1024) return '(' + bytes + ' B)'
      if (bytes < 1048576) return '(' + (bytes / 1024).toFixed(1) + ' KB)'
      if (bytes < 1073741824) return '(' + (bytes / 1048576).toFixed(1) + ' MB)'
      return '(' + (bytes / 1073741824).toFixed(1) + ' GB)'
    },
    emit,
    isFinished(task: Task): boolean {
      return task.status === 'done' || task.status === 'error' || task.status === 'cancelled' || task.status === 'partial' || task.status === 'undone'
    },
    canUndo(task: Task): boolean {
      return !!(task.data && task.data.operation && task.data.operation !== 'trash-delete')
    },
    isCancelling(task: Task): boolean {
      return task.status === 'cancelling'
    },
    taskIcon(task: Task): string {
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
    taskSpeed(task: Task): string {
      if (task.status === 'paused') return 'Paused'
      if (task.status === 'counting') return ''
      if (task.status === 'cancelling') return ''
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
    statusLabel(task: Task): string {
      switch(task.status) {
        case 'active': return 'In progress'
        case 'paused': return 'Paused'
        case 'counting': return 'Counting files…'
        case 'cancelling': return 'Cancelling…'
        case 'done': return 'Completed'
        case 'error': return 'Error'
        case 'cancelled': return 'Cancelled'
        case 'undone': return 'Undone'
        case 'partial': return 'Partial success'
        default: return task.status
      }
    },
    closePopup() {
      this.open = false
    },
    showInfo(task: Task) {
      this.infoTask = task
    },
    onClickOutside(e: MouseEvent) {
      if (this.$el && !this.$el.contains(e.target as Node)) {
        this.open = false
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.onClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onClickOutside)
  }
})
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
  position: absolute;
  top: 100%;
  right: 0;
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
  scrollbar-gutter: stable;
}
.task-list::-webkit-scrollbar-thumb {
  background: #fff;
}
.popup-inner:hover .task-list::-webkit-scrollbar-thumb {
  background-color: rgba(150, 150, 150, 0.6);
  border: 2px solid rgba(0, 0, 0, 0);
  background-clip: padding-box;
  border-radius: 6px;
}
.popup-inner:hover .task-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 100, 100, 0.8);
}
.empty-msg {
  padding: 24px 16px;
  text-align: center;
  color: v-bind('theme.tableRow.params');
  font-size: 13px;
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
  align-items: center;
  margin-bottom: 4px;
}
.task-name-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.task-name {
  font-size: 13px;
  font-family: v-bind('theme.font');
  color: v-bind('theme.fontColor');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.task-size {
  font-size: 11px;
  color: v-bind('theme.tableRow.params');
  font-weight: normal;
  margin-left: 2px;
  flex-shrink: 0;
  white-space: nowrap;
}
.task-pct {
  font-size: 12px;
  color: v-bind('theme.tableRow.params');
  flex-shrink: 0;
  margin-left: 4px;
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
.task-status[data-status="paused"] {
  color: #e67e22;
}
.task-status[data-status="partial"] {
  color: #f39c12;
}
.task-status[data-status="cancelling"] {
  color: #95a5a6;
}
.task-status[data-status="counting"] {
  color: #95a5a6;
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
  min-width: 46px;
  justify-content: flex-end;
}
.task-actions.actions-4 {
  min-width: 94px;
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
.action-pause {
  color: #e67e22;
}
.action-pause:hover {
  background: rgba(230, 126, 34, 0.15);
}
.action-resume {
  color: #27ae60;
}
.action-resume:hover {
  background: rgba(39, 174, 96, 0.15);
}
.action-retry-failed {
  color: #e67e22;
}
.action-retry-failed:hover {
  background: rgba(230, 126, 34, 0.15);
}
.action-info {
  color: #7f8c8d;
}
.action-info:hover {
  background: rgba(127, 140, 141, 0.15);
}
.info-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.3);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.info-popup {
  background: v-bind('theme.dropDown.background');
  border: 1px solid v-bind('theme.dropDown.borderColor');
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  width: 440px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}
.info-title {
  font-size: 13px;
  font-family: v-bind('theme.font');
  font-weight: 600;
  color: v-bind('theme.fontColor');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.info-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: v-bind('theme.tableRow.params');
  cursor: pointer;
  border-radius: 3px;
  font-family: PureNerdFont, "Symbols Nerd Font Mono", "Noto Sans Nerd Font", "Meslo Nerd Font", "FiraCode Nerd Font", sans-serif;
  font-size: 12px;
  flex-shrink: 0;
  margin-left: 8px;
}
.info-close:hover {
  background: rgba(128,128,128,0.15);
}
.info-log {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px;
  font-size: 12px;
  font-family: monospace;
  color: v-bind('theme.fontColor');
  line-height: 1.5;
}
.log-entry {
  padding: 2px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  word-break: break-all;
}
.log-entry:last-child {
  border-bottom: none;
}
.log-empty {
  color: v-bind('theme.tableRow.params');
  text-align: center;
  padding: 20px 0;
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
