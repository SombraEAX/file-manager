import type { Task } from './stores/tasks'
import type { ElectronAPI } from './types/ipc'

export * from './types/ipc'

declare global {
  interface Window {
    electron: ElectronAPI
    __tasks: {
      tasks: Task[]
      createTask: typeof import('./stores/tasks').createTask
      updateTask: typeof import('./stores/tasks').updateTask
      cancelTask: typeof import('./stores/tasks').cancelTask
      removeTask: typeof import('./stores/tasks').removeTask
      pauseTask: typeof import('./stores/tasks').pauseTask
      resumeTask: typeof import('./stores/tasks').resumeTask
    }
  }
}

export {}
