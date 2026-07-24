<template>
  <div class="wrapper" v-if="tasks.length">
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
          <div class="task" v-for="task in tasks" :key="task.id">
            <div class="task-content">
              <div class="task-info">
                <div class="task-header">
                  <span class="task-name">{{ task.name }}</span>
                  <span class="task-pct" v-if="!isFinished(task)">{{ Math.round(task.progress) }}%</span>
                </div>
                <template v-if="!isFinished(task)">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
                  </div>
                  <div class="task-footer">
                    <span class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
                    <span class="task-eta">{{ formatTime(task.timeRemaining) }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="progress-track"></div>
                  <div class="task-footer">
                    <span class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
                    <span class="task-eta"></span>
                  </div>
                </template>
              </div>
              <div class="task-actions" v-if="task.status !== 'cancelled'">
                <button
                  v-if="task.status === 'done' && task.data && (task.data.operation === 'trash' || task.data.operation === 'trash-delete' || task.data.operation === 'trash-restore')"
                  class="action-btn action-folder"
                  title="Open folder"
                  @click="open = false; emit('task-open-folder', task)"
                >&#xf07b;</button>
                <button
                  v-if="task.status === 'active'"
                  class="action-btn action-cancel"
                  title="Cancel"
                  @click="emit('task-cancel', task.id)"
                >&#xf01d;</button>
                <button
                  v-if="task.status === 'error'"
                  class="action-btn action-retry"
                  title="Retry"
                  @click="emit('task-retry', task)"
                >&#xf021;</button>
                <button
                  v-if="task.status === 'done' && task.data && task.data.operation === 'trash'"
                  class="action-btn action-undo"
                  title="Undo"
                  @click="emit('task-undo', task)"
                >&#xf0e2;</button>
              </div>
            </div>
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

export default {
  data() {
    return {
      open: false,
      theme
    }
  },
  computed: {
    tasks() { return tasks },
    allFinished() {
      return this.tasks.length > 0 && this.tasks.every(t => t.status === 'done' || t.status === 'error' || t.status === 'cancelled')
    },
    hasErrors() {
      return this.tasks.some(t => t.status === 'error')
    },
    overallProgress() {
      if (!this.tasks.length) return 0
      return this.tasks.reduce((s, t) => s + t.progress, 0) / this.tasks.length
    },
    eta() {
      let times = this.tasks.filter(t => t.timeRemaining != null).map(t => t.timeRemaining)
      if (!times.length) return ''
      return formatTime(Math.min(...times))
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
    emit,
    isFinished(task) {
      return task.status === 'done' || task.status === 'error'
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
    onClickOutside(e) {
      if (!this.$el.contains(e.target) && !(this.$refs.popup && this.$refs.popup.contains(e.target))) {
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
  min-width: 260px;
  max-width: 360px;
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
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
}
.task {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  height: 56px;
  box-sizing: border-box;
}
.task:last-child {
  border-bottom: none;
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
}
.task-status {
  font-size: 11px;
  color: v-bind('theme.tableRow.params');
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
.task-content {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
}
.task-info {
  flex: 1;
  min-width: 0;
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
</style>
