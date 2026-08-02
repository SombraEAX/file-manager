import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TasksWidget from '../TasksWidget.vue'

vi.mock('../../theme.json', () => ({
  default: {
    font: 'sans-serif',
    fontColor: '#333',
    topPanelIconColor: '#666',
    topPanelIconHoverColor: '#000',
    tableRow: { params: '#999' },
    searchMode: { progressColor: '#4CAF50' },
    dropDown: { background: '#fff', borderColor: '#ddd' },
  },
}))

const mockEmit = vi.fn()
vi.mock('../../stores/events', () => ({
  emit: (...args) => mockEmit(...args),
}))

let mockTasks = []
vi.mock('../../stores/tasks', () => ({
  get tasks() { return mockTasks },
  removeTask: vi.fn(),
  formatTime: (s) => s == null ? '' : s < 60 ? Math.ceil(s) + 's' : Math.ceil(s / 60) + 'm',
}))

function createMockTask(overrides) {
  return {
    id: 1,
    name: 'Test task',
    progress: 50,
    status: 'active',
    timeRemaining: 30,
    startedAt: Date.now() - 5000,
    totalSize: 1024,
    from: '/source',
    to: '/dest',
    data: { operation: 'copy' },
    ...overrides,
  }
}

async function mountWidgetOpen(tasks, options = {}) {
  mockTasks = tasks
  const wrapper = mount(TasksWidget, {
    props: options.props || {},
    attachTo: document.body,
    global: {
      stubs: { Teleport: true },
    },
  })
  wrapper.vm.useMock = false
  wrapper.vm.open = true
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TasksWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks = []
  })

  describe('widget button', () => {
    it('does not render when no tasks', async() => {
      const wrapper = await mountWidgetOpen([])
      expect(wrapper.find('.wrapper').exists()).toBe(false)
    })

    it('renders when tasks exist', async() => {
      const wrapper = await mountWidgetOpen([createMockTask()])
      expect(wrapper.find('.wrapper').exists()).toBe(true)
    })

    it('shows checkmark when all tasks finished', async() => {
      const wrapper = await mountWidgetOpen([
        createMockTask({ status: 'done', progress: 100 }),
      ])
      expect(wrapper.find('.checkmark').exists()).toBe(true)
      expect(wrapper.find('.checkmark.warning').exists()).toBe(false)
    })

    it('shows warning checkmark when tasks have errors', async() => {
      const wrapper = await mountWidgetOpen([
        createMockTask({ status: 'error', progress: 100 }),
      ])
      expect(wrapper.find('.checkmark.warning').exists()).toBe(true)
    })

    it('shows progress bar when tasks are active', async() => {
      const wrapper = await mountWidgetOpen([createMockTask()])
      expect(wrapper.find('.bar-wrap').exists()).toBe(true)
      expect(wrapper.find('.eta').exists()).toBe(true)
    })

    it('shows paused task progress in the overall bar', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'paused', progress: 60 })])
      expect(wrapper.find('.bar-wrap').exists()).toBe(true)
      expect(wrapper.find('.bar').attributes('style')).toContain('width: 60%')
    })

    it('averages active and paused task progress in the overall bar', async() => {
      const wrapper = await mountWidgetOpen([
        createMockTask({ id: 1, status: 'active', progress: 40 }),
        createMockTask({ id: 2, status: 'paused', progress: 80 }),
      ])
      expect(wrapper.find('.bar').attributes('style')).toContain('width: 60%')
    })
  })

  describe('buttons per status — active', () => {
    it('shows Cancel and Pause buttons', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'active' })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-cancel').exists()).toBe(true)
      expect(actions.find('.action-pause').exists()).toBe(true)
      expect(actions.find('.action-folder').exists()).toBe(false)
      expect(actions.find('.action-retry').exists()).toBe(false)
      expect(actions.find('.action-undo').exists()).toBe(false)
    })

    it('Cancel emits task-cancel with task id', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ id: 42, status: 'active' })])
      await wrapper.find('.action-cancel').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-cancel', 42)
    })

    it('Pause emits task-pause with task id', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ id: 7, status: 'active' })])
      await wrapper.find('.action-pause').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-pause', 7)
    })

    it('shows progress bar and from/to paths', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'active' })])
      expect(wrapper.find('.progress-fill').exists()).toBe(true)
      expect(wrapper.find('.progress-track-done').exists()).toBe(false)
      expect(wrapper.text()).toContain('From')
      expect(wrapper.text()).toContain('/source')
      expect(wrapper.text()).toContain('/dest')
    })

    it('shows percentage', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'active', progress: 72 })])
      expect(wrapper.text()).toContain('72%')
    })
  })

  describe('buttons per status — paused', () => {
    it('shows Cancel and Resume buttons', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'paused' })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-cancel').exists()).toBe(true)
      expect(actions.find('.action-resume').exists()).toBe(true)
      expect(actions.find('.action-folder').exists()).toBe(false)
    })

    it('Resume emits task-resume with task id', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ id: 5, status: 'paused' })])
      await wrapper.find('.action-resume').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-resume', 5)
    })

    it('Cancel emits task-cancel', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ id: 5, status: 'paused' })])
      await wrapper.find('.action-cancel').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-cancel', 5)
    })

    it('shows progress bar (not finished)', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'paused' })])
      expect(wrapper.find('.progress-fill').exists()).toBe(true)
    })
  })

  describe('buttons per status — counting', () => {
    it('shows only Cancel button', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'counting', progress: 0 })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-cancel').exists()).toBe(true)
      expect(actions.find('.action-folder').exists()).toBe(false)
      expect(actions.find('.action-retry').exists()).toBe(false)
    })
  })

  describe('buttons per status — done', () => {
    it('shows Show in folder and Undo buttons', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'done', progress: 100 })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-undo').exists()).toBe(true)
      expect(actions.find('.action-cancel').exists()).toBe(false)
      expect(actions.find('.action-retry').exists()).toBe(false)
    })

    it('hides Undo for permanently-deleted (trash-delete) tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({
        status: 'done',
        progress: 100,
        data: { operation: 'trash-delete' },
      })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-undo').exists()).toBe(false)
    })

    it('hides Undo when task has no undoable operation', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({
        status: 'done',
        progress: 100,
        data: { operation: 'trash-delete', originalPaths: ['/trash/foo'] },
      })])
      expect(wrapper.find('.action-undo').exists()).toBe(false)
    })

    it('Show in folder emits task-open-folder', async() => {
      const task = createMockTask({ id: 99, status: 'done', progress: 100 })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-folder').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-open-folder', task)
    })

    it('Undo emits task-undo', async() => {
      const task = createMockTask({ id: 99, status: 'done', progress: 100 })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-undo').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-undo', task)
    })

    it('shows Completed status label', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'done', progress: 100 })])
      expect(wrapper.text()).toContain('Completed')
    })

    it('shows progress-track-done (hidden track)', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'done', progress: 100 })])
      expect(wrapper.find('.progress-track-done').exists()).toBe(true)
      expect(wrapper.find('.progress-fill').exists()).toBe(false)
    })

    it('does not show percentage', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'done', progress: 100 })])
      expect(wrapper.find('.task-pct').exists()).toBe(false)
    })
  })

  describe('buttons per status — error', () => {
    it('shows Show in folder and Retry buttons', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'error', progress: 100 })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-retry').exists()).toBe(true)
      expect(actions.find('.action-cancel').exists()).toBe(false)
      expect(actions.find('.action-undo').exists()).toBe(false)
    })

    it('Retry emits task-retry', async() => {
      const task = createMockTask({ id: 33, status: 'error', progress: 100 })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-retry').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-retry', task)
    })

    it('shows Error status label', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'error', progress: 100 })])
      expect(wrapper.text()).toContain('Error')
    })
  })

  describe('buttons per status — cancelled', () => {
    it('shows only Show in folder button', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'cancelled', progress: 100 })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-cancel').exists()).toBe(false)
      expect(actions.find('.action-retry').exists()).toBe(false)
      expect(actions.find('.action-undo').exists()).toBe(false)
    })

    it('shows Cancelled status label', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'cancelled', progress: 100 })])
      expect(wrapper.text()).toContain('Cancelled')
    })
  })

  describe('buttons per status — undone', () => {
    it('shows only Show in folder button', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'undone', progress: 100 })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-cancel').exists()).toBe(false)
      expect(actions.find('.action-retry').exists()).toBe(false)
      expect(actions.find('.action-undo').exists()).toBe(false)
    })

    it('shows Undone status label', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'undone', progress: 100 })])
      expect(wrapper.text()).toContain('Undone')
    })

    it('is considered finished (checkmark)', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'undone', progress: 100 })])
      expect(wrapper.find('.checkmark').exists()).toBe(true)
      expect(wrapper.find('.checkmark.warning').exists()).toBe(false)
    })
  })

  describe('buttons per status — partial', () => {
    it('shows Folder, Undo, Retry failed, and Info buttons', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'partial', progress: 100 })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-undo').exists()).toBe(true)
      expect(actions.find('.action-retry-failed').exists()).toBe(true)
      expect(actions.find('.action-info').exists()).toBe(true)
    })

    it('hides Undo for trash-delete partial tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({
        status: 'partial',
        progress: 100,
        data: { operation: 'trash-delete', originalPaths: ['/trash/foo'] },
      })])
      const actions = wrapper.find('.task-actions')
      expect(actions.find('.action-folder').exists()).toBe(true)
      expect(actions.find('.action-undo').exists()).toBe(false)
      expect(actions.find('.action-retry-failed').exists()).toBe(true)
      expect(actions.find('.action-info').exists()).toBe(true)
    })

    it('Retry failed emits task-retry-failed', async() => {
      const task = createMockTask({ id: 55, status: 'partial', progress: 100 })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-retry-failed').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-retry-failed', task)
    })

    it('Undo emits task-undo', async() => {
      const task = createMockTask({ id: 55, status: 'partial', progress: 100 })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-undo').trigger('click')
      expect(mockEmit).toHaveBeenCalledWith('task-undo', task)
    })

    it('shows Partial success status label', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'partial', progress: 100 })])
      expect(wrapper.text()).toContain('Partial success')
    })

    it('Info button opens info popup', async() => {
      const task = createMockTask({
        id: 55,
        status: 'partial',
        progress: 100,
        data: { operation: 'copy', errorLog: ['Error 1', 'Error 2'] },
      })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-info').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.info-popup-overlay').exists()).toBe(true)
      expect(wrapper.find('.info-popup').exists()).toBe(true)
      expect(wrapper.find('.info-log').text()).toContain('Error 1')
      expect(wrapper.find('.info-log').text()).toContain('Error 2')
    })
  })

  describe('info popup', () => {
    it('shows empty message when no error log', async() => {
      const task = createMockTask({
        status: 'partial',
        progress: 100,
        data: { operation: 'copy', errorLog: [] },
      })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-info').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.log-empty').exists()).toBe(true)
      expect(wrapper.find('.log-empty').text()).toBe('No errors logged')
    })

    it('closes when clicking close button', async() => {
      const task = createMockTask({
        status: 'partial',
        progress: 100,
        data: { operation: 'copy', errorLog: ['msg'] },
      })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-info').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.info-popup-overlay').exists()).toBe(true)

      await wrapper.find('.info-close').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.info-popup-overlay').exists()).toBe(false)
    })

    it('closes when clicking overlay background', async() => {
      const task = createMockTask({
        status: 'partial',
        progress: 100,
        data: { operation: 'copy', errorLog: ['msg'] },
      })
      const wrapper = await mountWidgetOpen([task])
      await wrapper.find('.action-info').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.info-popup-overlay').exists()).toBe(true)

      await wrapper.find('.info-popup-overlay').trigger('click.self')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.info-popup-overlay').exists()).toBe(false)
    })
  })

  describe('multiple tasks', () => {
    it('renders each task with correct buttons', async() => {
      const tasks = [
        createMockTask({ id: 1, name: 'Active task', status: 'active' }),
        createMockTask({ id: 2, name: 'Done task', status: 'done', progress: 100 }),
        createMockTask({ id: 3, name: 'Error task', status: 'error', progress: 100 }),
      ]
      const wrapper = await mountWidgetOpen(tasks)

      const taskItems = wrapper.findAll('.task')
      expect(taskItems.length).toBe(3)

      expect(taskItems[0].find('.action-cancel').exists()).toBe(true)
      expect(taskItems[0].find('.action-pause').exists()).toBe(true)

      expect(taskItems[1].find('.action-folder').exists()).toBe(true)
      expect(taskItems[1].find('.action-undo').exists()).toBe(true)

      expect(taskItems[2].find('.action-folder').exists()).toBe(true)
      expect(taskItems[2].find('.action-retry').exists()).toBe(true)
    })
  })

  describe('stats footer', () => {
    it('displays correct counts', async() => {
      const tasks = [
        createMockTask({ id: 1, status: 'active' }),
        createMockTask({ id: 2, status: 'active' }),
        createMockTask({ id: 3, status: 'done', progress: 100 }),
        createMockTask({ id: 4, status: 'error', progress: 100 }),
      ]
      const wrapper = await mountWidgetOpen(tasks)
      const statsText = wrapper.find('.stats-text').text()
      expect(statsText).toContain('Tasks: 4')
      expect(statsText).toContain('completed: 1')
      expect(statsText).toContain('active: 2')
      expect(statsText).toContain('error: 1')
    })
  })

  describe('task icon', () => {
    it('uses correct icon class for copy', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ data: { operation: 'copy' } })])
      expect(wrapper.find('.op-copy').exists()).toBe(true)
    })

    it('uses correct icon class for trash', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ data: { operation: 'trash' } })])
      expect(wrapper.find('.op-trash').exists()).toBe(true)
    })

    it('uses correct icon class for trash-restore', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ data: { operation: 'trash-restore' } })])
      expect(wrapper.find('.op-trash-restore').exists()).toBe(true)
    })

    it('uses default icon class when no operation', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ data: {} })])
      expect(wrapper.find('.op-default').exists()).toBe(true)
    })
  })

  describe('speed block', () => {
    it('shows speed for active tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'active' })])
      expect(wrapper.find('.task-speed-block').exists()).toBe(true)
    })

    it('shows status label "Paused" for paused tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'paused' })])
      expect(wrapper.find('.task-status').text()).toBe('Paused')
    })

    it('shows time remaining for active tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'active', timeRemaining: 30 })])
      expect(wrapper.find('.task-time').exists()).toBe(true)
    })

    it('does not show time remaining for paused tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'paused', timeRemaining: 30 })])
      expect(wrapper.find('.task-time').exists()).toBe(false)
    })

    it('does not show time remaining for done tasks', async() => {
      const wrapper = await mountWidgetOpen([createMockTask({ status: 'done', progress: 100 })])
      expect(wrapper.find('.task-time').exists()).toBe(false)
    })
  })
})
