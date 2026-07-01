import { reactive } from 'vue'

export const tasks = reactive([])
let nextId = 0

export function createTask(name) {
  const task = reactive({
    id: ++nextId,
    name,
    progress: 0,
    status: 'active',
    timeRemaining: null
  })
  tasks.push(task)
  return task
}

export function updateTask(id, updates) {
  const task = tasks.find(t => t.id === id)
  if (task) Object.assign(task, updates)
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

export function addTestTasks() {
  createTask('Copying files…')
  updateTask(1, { progress: 75, timeRemaining: 12, status: 'active' })

  createTask('Download archive')
  updateTask(2, { progress: 100, timeRemaining: 0, status: 'done' })

  createTask('Export data')
  updateTask(3, { progress: 100, timeRemaining: 0, status: 'error' })
}

addTestTasks()

export default { tasks, createTask, updateTask, removeTask, formatTime }
