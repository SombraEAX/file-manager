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
            <div class="task-header">
              <span class="task-name">{{ task.name }}</span>
              <span class="task-pct">{{ Math.round(task.progress) }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
            </div>
            <div class="task-footer">
              <span class="task-status" :data-status="task.status">{{ statusLabel(task) }}</span>
              <span class="task-eta">{{ formatTime(task.timeRemaining) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import theme from '../../theme.json'
import { tasks, formatTime } from '../stores/tasks'

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
      return this.tasks.length > 0 && this.tasks.every(t => t.status === 'done' || t.status === 'error')
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
    statusLabel(task) {
      switch(task.status) {
        case 'active': return 'In progress'
        case 'paused': return 'Paused'
        case 'done': return 'Completed'
        case 'error': return 'Error'
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
</style>
