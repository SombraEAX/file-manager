import { describe, it, expect, beforeEach } from 'vitest'
import { tasks, createTask, updateTask, cancelTask, pauseTask, resumeTask, removeTask, formatTime } from '../tasks'

describe('tasks store', () => {
  beforeEach(() => {
    tasks.splice(0, tasks.length)
  })

  describe('createTask', () => {
    it('creates a task with correct defaults', () => {
      const task = createTask('Test task', { operation: 'copy' })

      expect(task.id).toBeGreaterThan(0)
      expect(task.name).toBe('Test task')
      expect(task.progress).toBe(0)
      expect(task.status).toBe('active')
      expect(task.timeRemaining).toBeNull()
      expect(task.startedAt).toBeGreaterThan(0)
      expect(task.data).toEqual({ operation: 'copy' })
    })

    it('adds task to the reactive array', () => {
      expect(tasks.length).toBe(0)
      createTask('Task 1')
      expect(tasks.length).toBe(1)
      expect(tasks[0].name).toBe('Task 1')
    })

    it('generates unique incrementing IDs', () => {
      const t1 = createTask('Task 1')
      const t2 = createTask('Task 2')
      const t3 = createTask('Task 3')

      expect(t2.id).toBe(t1.id + 1)
      expect(t3.id).toBe(t2.id + 1)
    })

    it('creates task with empty data by default', () => {
      const task = createTask('No data')
      expect(task.data).toEqual({})
    })
  })

  describe('updateTask', () => {
    it('updates task properties', () => {
      const task = createTask('Test')
      updateTask(task.id, { name: 'Updated', progress: 50 })

      expect(task.name).toBe('Updated')
      expect(task.progress).toBe(50)
    })

    it('auto-calculates timeRemaining from progress rate', () => {
      const task = createTask('Test')
      task.startedAt = Date.now() - 10000
      updateTask(task.id, { progress: 50, totalSize: 1000 })

      expect(task.timeRemaining).toBeGreaterThan(0)
    })

    it('does not overwrite timeRemaining if provided', () => {
      const task = createTask('Test')
      updateTask(task.id, { progress: 50, timeRemaining: 42 })

      expect(task.timeRemaining).toBe(42)
    })

    it('does not calculate timeRemaining for completed tasks', () => {
      const task = createTask('Test')
      updateTask(task.id, { status: 'done', progress: 100 })

      expect(task.timeRemaining).toBeNull()
    })

    it('does nothing for non-existent task', () => {
      updateTask(9999, { name: 'Ghost' })
      expect(tasks.length).toBe(0)
    })
  })

  describe('cancelTask', () => {
    it('sets status to cancelled', () => {
      const task = createTask('Test')
      cancelTask(task.id)

      expect(task.status).toBe('cancelled')
    })

    it('appends (cancelled) to task name', () => {
      const task = createTask('Copying files…')
      cancelTask(task.id)

      expect(task.name).toBe('Copying files (cancelled)')
    })

    it('does nothing for non-existent task', () => {
      cancelTask(9999)
      expect(tasks.length).toBe(0)
    })
  })

  describe('pauseTask', () => {
    it('sets status to paused', () => {
      const task = createTask('Test')
      pauseTask(task.id)

      expect(task.status).toBe('paused')
    })

    it('does nothing for non-existent task', () => {
      pauseTask(9999)
      expect(tasks.length).toBe(0)
    })
  })

  describe('resumeTask', () => {
    it('sets status back to active', () => {
      const task = createTask('Test')
      pauseTask(task.id)
      expect(task.status).toBe('paused')

      resumeTask(task.id)
      expect(task.status).toBe('active')
    })

    it('does nothing for non-existent task', () => {
      resumeTask(9999)
      expect(tasks.length).toBe(0)
    })
  })

  describe('removeTask', () => {
    it('removes task from array by id', () => {
      const t1 = createTask('Task 1')
      const t2 = createTask('Task 2')
      expect(tasks.length).toBe(2)

      removeTask(t1.id)
      expect(tasks.length).toBe(1)
      expect(tasks[0].id).toBe(t2.id)
    })

    it('does nothing for non-existent task', () => {
      createTask('Keep')
      removeTask(9999)
      expect(tasks.length).toBe(1)
    })
  })

  describe('formatTime', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatTime(null)).toBe('')
      expect(formatTime(undefined)).toBe('')
    })

    it('formats seconds', () => {
      expect(formatTime(30)).toBe('30s')
      expect(formatTime(59)).toBe('59s')
    })

    it('formats minutes', () => {
      expect(formatTime(60)).toBe('1m')
      expect(formatTime(90)).toBe('2m')
      expect(formatTime(3599)).toBe('60m')
    })

    it('formats hours', () => {
      expect(formatTime(3600)).toBe('1h')
      expect(formatTime(7200)).toBe('2h')
    })
  })
})
