import { describe, it, expect, beforeEach } from 'vitest'
import { tasks, createTask, updateTask, cancelTask, pauseTask, resumeTask, removeTask, createThrottledRunner, type Task } from '../stores/tasks'

describe('task state transitions', () => {
  beforeEach(() => {
    tasks.splice(0, tasks.length)
  })

  function simulateProgress(task: Task, done: number, total: number, errors = 0) {
    const successCount = done - errors
    updateTask(task.id, {
      progress: Math.round((done / total) * 100),
      timeRemaining: null,
      status: done >= total
        ? errors ? (successCount > 0 ? 'partial' : 'error') : 'done'
        : 'active',
      name: errors ? `Operation (${errors} errors)` : `Processing file ${done}/${total}`,
    })
  }

  function simulateFinalResult(task: Task, totalPaths: number, resultErrors = 0) {
    const successCount = totalPaths - resultErrors
    updateTask(task.id, {
      progress: 100,
      status: resultErrors
        ? (successCount > 0 ? 'partial' : 'error')
        : 'done',
      name: resultErrors
        ? `Failed (${resultErrors})`
        : `Completed ${totalPaths} files`,
      timeRemaining: 0,
    })
  }

  describe('copy operation lifecycle', () => {
    it('active → done on successful completion', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })

      simulateProgress(task, 5, 10, 0)
      expect(task.status).toBe('active')
      expect(task.progress).toBe(50)

      simulateProgress(task, 10, 10, 0)
      expect(task.status).toBe('done')
      expect(task.progress).toBe(100)
    })

    it('active → error when all files fail', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })

      simulateProgress(task, 10, 10, 10)
      expect(task.status).toBe('error')
    })

    it('active → partial when some files fail', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })

      simulateProgress(task, 10, 10, 3)
      expect(task.status).toBe('partial')
    })

    it('can be cancelled during progress', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })

      simulateProgress(task, 3, 10, 0)
      expect(task.status).toBe('active')

      cancelTask(task.id)
      expect(task.status).toBe('cancelled')
      expect(task.name).toContain('(cancelled)')
    })

    it('can be paused and resumed', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })

      simulateProgress(task, 5, 10, 0)
      expect(task.status).toBe('active')

      pauseTask(task.id)
      expect(task.status).toBe('paused')

      resumeTask(task.id)
      expect(task.status).toBe('active')

      simulateProgress(task, 10, 10, 0)
      expect(task.status).toBe('done')
    })

    it('final result determines partial vs error', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })

      simulateFinalResult(task, 5, 0)
      expect(task.status).toBe('done')

      const task2 = createTask('Copying files…', { operation: 'copy', errorLog: [] })
      simulateFinalResult(task2, 5, 2)
      expect(task2.status).toBe('partial')

      const task3 = createTask('Copying files…', { operation: 'copy', errorLog: [] })
      simulateFinalResult(task3, 5, 5)
      expect(task3.status).toBe('error')
    })
  })

  describe('trash operation lifecycle', () => {
    it('active → done on successful completion', () => {
      const task = createTask('Moving to trash…', { operation: 'trash', errorLog: [] })

      simulateProgress(task, 3, 3, 0)
      expect(task.status).toBe('done')
    })

    it('active → partial when some fail', () => {
      const task = createTask('Moving to trash…', { operation: 'trash', errorLog: [] })

      simulateProgress(task, 3, 3, 1)
      expect(task.status).toBe('partial')
    })

    it('active → error when all fail', () => {
      const task = createTask('Moving to trash…', { operation: 'trash', errorLog: [] })

      simulateProgress(task, 3, 3, 3)
      expect(task.status).toBe('error')
    })

    it('can be cancelled', () => {
      const task = createTask('Moving to trash…', { operation: 'trash', errorLog: [] })

      simulateProgress(task, 1, 3, 0)
      cancelTask(task.id)
      expect(task.status).toBe('cancelled')
    })
  })

  describe('trash-delete operation lifecycle', () => {
    it('active → done', () => {
      const task = createTask('Deleting from trash…', { operation: 'trash-delete', errorLog: [] })

      simulateProgress(task, 2, 2, 0)
      expect(task.status).toBe('done')
    })

    it('active → partial', () => {
      const task = createTask('Deleting from trash…', { operation: 'trash-delete', errorLog: [] })

      simulateProgress(task, 2, 2, 1)
      expect(task.status).toBe('partial')
    })

    it('active → error', () => {
      const task = createTask('Deleting from trash…', { operation: 'trash-delete', errorLog: [] })

      simulateProgress(task, 2, 2, 2)
      expect(task.status).toBe('error')
    })
  })

  describe('trash-restore operation lifecycle', () => {
    it('active → done', () => {
      const task = createTask('Restoring from trash…', { operation: 'trash-restore', errorLog: [] })

      simulateProgress(task, 4, 4, 0)
      expect(task.status).toBe('done')
    })

    it('active → partial', () => {
      const task = createTask('Restoring from trash…', { operation: 'trash-restore', errorLog: [] })

      simulateProgress(task, 4, 4, 2)
      expect(task.status).toBe('partial')
    })

    it('active → error', () => {
      const task = createTask('Restoring from trash…', { operation: 'trash-restore', errorLog: [] })

      simulateProgress(task, 4, 4, 4)
      expect(task.status).toBe('error')
    })
  })

  describe('error logging', () => {
    it('errorLog accumulates errors', () => {
      const task = createTask('Copying files…', { operation: 'copy', errorLog: [] })
      const errorLog = task.data.errorLog || []

      errorLog.push('File A: permission denied')
      errorLog.push('File B: not found')

      expect(errorLog.length).toBe(2)
      expect(errorLog[0]).toBe('File A: permission denied')
      expect(errorLog[1]).toBe('File B: not found')
    })
  })

  describe('retry after error', () => {
    it('removes old task and creates new one for retry', () => {
      const original = createTask('Copying files…', {
        operation: 'copy',
        originalPaths: ['/a.txt', '/b.txt'],
        destDir: '/backup',
        errorLog: ['error'],
      })
      const originalId = original.id

      removeTask(original.id)
      expect(tasks.find(t => t.id === originalId)).toBeUndefined()

      const retried = createTask('Copying files…', {
        operation: 'copy',
        originalPaths: ['/a.txt', '/b.txt'],
        destDir: '/backup',
        errorLog: [],
      })

      expect(retried.id).not.toBe(originalId)
      expect(retried.status).toBe('active')
      expect(retried.data.errorLog).toEqual([])
      expect(tasks.length).toBe(1)
    })
  })

  describe('undo after done', () => {
    it('transitions done task to active for undo', () => {
      const task = createTask('Copied files', {
        operation: 'copy',
        status: 'done',
        progress: 100,
      })
      task.status = 'done'
      task.progress = 100

      updateTask(task.id, {
        status: 'active',
        name: 'Removing copied files…',
        progress: 0,
        from: '/backup',
        to: '',
      })

      expect(task.status).toBe('active')
      expect(task.progress).toBe(0)
      expect(task.name).toBe('Removing copied files…')
    })
  })

  describe('undo throttling', () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    it('blocks a second undo for the same task while the first is running', async () => {
      const throttle = createThrottledRunner()
      let runs = 0
      const run = () => new Promise<void>(res => setTimeout(() => { runs++; res() }, 20))

      const first = throttle('task-1', run)
      expect(first).toBe(true)

      const second = throttle('task-1', run)
      expect(second).toBe(false)

      await sleep(60)
      expect(runs).toBe(1)
    })

    it('allows undo again for the same task after it finished', async () => {
      const throttle = createThrottledRunner()
      let runs = 0
      const run = () => new Promise<void>(res => setTimeout(() => { runs++; res() }, 10))

      throttle('task-1', run)
      await sleep(30)
      expect(throttle('task-1', run)).toBe(true)
      await sleep(30)
      expect(runs).toBe(2)
    })

    it('serializes undo of different tasks so they do not run concurrently', async () => {
      const throttle = createThrottledRunner()
      const order: string[] = []
      const makeRun = (name: string) => () => new Promise<void>(res => setTimeout(() => { order.push(name); res() }, 10))

      throttle('task-a', makeRun('a'))
      throttle('task-b', makeRun('b'))

      await sleep(80)
      expect(order).toEqual(['a', 'b'])
    })

    it('keeps the queue working after a runner throws', async () => {
      const throttle = createThrottledRunner()
      throttle('task-a', () => Promise.reject(new Error('boom')))

      let bRan = false
      throttle('task-b', () => { bRan = true; return Promise.resolve() })

      await sleep(30)
      expect(bRan).toBe(true)
    })
  })

  describe('widget display logic', () => {
    it('isFinished returns true for done, error, cancelled, partial, undone', () => {
      function isFinished(status: string) {
        return status === 'done' || status === 'error' || status === 'cancelled' || status === 'partial' || status === 'undone'
      }

      expect(isFinished('done')).toBe(true)
      expect(isFinished('error')).toBe(true)
      expect(isFinished('cancelled')).toBe(true)
      expect(isFinished('partial')).toBe(true)
      expect(isFinished('undone')).toBe(true)
      expect(isFinished('active')).toBe(false)
      expect(isFinished('paused')).toBe(false)
      expect(isFinished('counting')).toBe(false)
      expect(isFinished('cancelling')).toBe(false)
    })

    it('allFinished returns true only when all tasks are finished', () => {
      function allFinished(taskList: { status: string }[]) {
        return taskList.length > 0 && taskList.every(t =>
          t.status === 'done' || t.status === 'error' || t.status === 'cancelled' || t.status === 'partial'
        )
      }

      expect(allFinished([
        { status: 'done' },
        { status: 'error' },
      ])).toBe(true)

      expect(allFinished([
        { status: 'done' },
        { status: 'active' },
      ])).toBe(false)

      expect(allFinished([])).toBe(false)
    })

    it('buttons per status match checklist', () => {
      const expectedButtons = {
        active: ['action-cancel', 'action-pause'],
        paused: ['action-cancel', 'action-resume'],
        counting: ['action-cancel'],
        done: ['action-folder', 'action-undo'],
        error: ['action-folder', 'action-retry'],
        cancelled: ['action-folder'],
        undone: ['action-folder'],
        partial: ['action-folder', 'action-undo', 'action-retry-failed', 'action-info'],
      }

      for (const [status, buttons] of Object.entries(expectedButtons)) {
        expect(buttons, `status "${status}"`).toBeDefined()
        expect(buttons.length, `status "${status}" button count`).toBeGreaterThan(0)
      }
    })
  })
})
