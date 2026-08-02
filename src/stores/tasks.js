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
    startedAt: Date.now(),
    data
  })
  tasks.push(task)
  return task
}

export function updateTask(id, updates) {
  const task = tasks.find(t => t.id === id)
  if (!task) return
  Object.assign(task, updates)
  if (task.status === 'active' && task.progress > 0 && task.progress < 100 && (updates.timeRemaining == null || updates.timeRemaining === undefined)) {
    const elapsed = (Date.now() - task.startedAt) / 1000
    const rate = task.progress / elapsed
    task.timeRemaining = rate > 0 ? (100 - task.progress) / rate : null
  }
}

export function cancelTask(id) {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'cancelled'
    task.name = task.name.replace(/…$/, '') + ' (cancelled)'
  }
}

export function pauseTask(id) {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'paused'
  }
}

export function resumeTask(id) {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'active'
  }
}

export function removeTask(id) {
  const idx = tasks.findIndex(t => t.id === id)
  if (idx !== -1) tasks.splice(idx, 1)
}

export function createThrottledRunner() {
  const busy = new Set()
  let queue = Promise.resolve()
  return function throttledRunner(key, run) {
    if (busy.has(key)) return false
    busy.add(key)
    queue = Promise.resolve(queue).then(async () => {
      try {
        await run()
      } catch (e) {
        console.error('throttled runner failed:', e)
      } finally {
        busy.delete(key)
      }
    })
    return true
  }
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

export default { tasks, createTask, updateTask, cancelTask, pauseTask, resumeTask, removeTask, formatTime, createThrottledRunner }
