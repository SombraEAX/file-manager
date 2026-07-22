import { reactive } from 'vue'

export const tasks = reactive([])
let nextId = 0

export function createTask(name, data = {}) {
  const task = reactive({
    id: ++nextId,
    name,
    progress: 0,
    status: 'active',
    timeRemaining: null,
    data
  })
  tasks.push(task)
  return task
}

export function updateTask(id, updates) {
  const task = tasks.find(t => t.id === id)
  if (task) Object.assign(task, updates)
}

export function cancelTask(id) {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'cancelled'
    task.name = task.name.replace(/…$/, '') + ' (cancelled)'
  }
}

export function removeTask(id) {
  const idx = tasks.findIndex(t => t.id === id)
  if (idx !== -1) tasks.splice(idx, 1)
}

export function formatTime(seconds) {
  if (seconds == null) return ''
  if (seconds < 60) return Math.ceil(seconds) + 's'
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'm'
  return Math.ceil(seconds / 3600) + 'h'
}

export function useTasks() {
  return tasks
}

export default { tasks, createTask, updateTask, cancelTask, removeTask, formatTime }
