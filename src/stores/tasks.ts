import { reactive } from 'vue'

export interface TaskData {
  operation?: string
  errorLog?: string[]
  originalPaths?: string[]
  destDir?: string
  status?: string
  progress?: number
  copiedPaths?: string[]
  failedPaths?: string[]
  trashNames?: string[]
  parentDir?: string
  batch?: string[]
  done?: number
  id?: number
  type?: string
}

export interface Task {
  id: number
  name: string
  progress: number
  status: string
  timeRemaining: number | null
  startedAt: number
  data: TaskData
  totalSize?: number
  from?: string
  to?: string
}

export const tasks = reactive<Task[]>([])
let nextId = 0

export function createTask(name: string, data: TaskData = {}): Task {
  const task = reactive<Task>({
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

export function updateTask(id: number, updates: Partial<Task>): void {
  const task = tasks.find(t => t.id === id)
  if (!task) return
  Object.assign(task, updates)
  if (task.status === 'active' && task.progress > 0 && task.progress < 100 && (updates.timeRemaining == null || updates.timeRemaining === undefined)) {
    const elapsed = (Date.now() - task.startedAt) / 1000
    const rate = task.progress / elapsed
    task.timeRemaining = rate > 0 ? (100 - task.progress) / rate : null
  }
}

export function cancelTask(id: number): void {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'cancelled'
    task.name = task.name.replace(/…$/, '') + ' (cancelled)'
  }
}

export function pauseTask(id: number): void {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'paused'
  }
}

export function resumeTask(id: number): void {
  const task = tasks.find(t => t.id === id)
  if (task) {
    task.status = 'active'
  }
}

export function removeTask(id: number): void {
  const idx = tasks.findIndex(t => t.id === id)
  if (idx !== -1) tasks.splice(idx, 1)
}

export function createThrottledRunner(): (key: string | number, run: () => Promise<void>) => boolean {
  const busy = new Set<string | number>()
  let queue: Promise<void> = Promise.resolve()
  return function throttledRunner(key: string | number, run: () => Promise<void>): boolean {
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

export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return ''
  if (seconds < 60) return Math.ceil(seconds) + 's'
  if (seconds < 3600) return Math.ceil(seconds / 60) + 'm'
  return Math.ceil(seconds / 3600) + 'h'
}

export function useTasks() {
  return tasks
}

export default { tasks, createTask, updateTask, cancelTask, pauseTask, resumeTask, removeTask, formatTime, createThrottledRunner }
