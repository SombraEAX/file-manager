import { test, expect, afterEach } from '@playwright/test'
import * as path from 'path'
import * as fsp from 'fs/promises'
import * as os from 'os'
import { launchApp, createTempDir, createTempFiles, fileExists } from './helpers'

let app, page
let tempDirs = []

afterEach(async () => {
  if (app) await app.close().catch(() => {})
  for (const dir of tempDirs) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
  tempDirs = []
  app = null
  page = null
})

async function setup() {
  const launched = await launchApp()
  app = launched.app
  page = launched.window
}

async function nav(dirPath) {
  await page.locator('.breadcrumbs').first().waitFor({ state: 'visible', timeout: 100000 })
  await page.evaluate(() => {
    const bc = document.querySelector('.breadcrumbs')
    if (bc) bc.click()
  })
  await page.waitForTimeout(500)
  const input = page.locator('input.address')
  await input.waitFor({ state: 'visible', timeout: 10000 })
  await input.fill(dirPath)
  await input.press('Enter', { noWaitAfter: true })
  await page.waitForTimeout(2000)
}

async function selectFile(filename) {
  await page.evaluate((filename) => {
    const labels = document.querySelectorAll('.label')
    for (const label of labels) {
      if (label.textContent.includes(filename)) {
        const row = label.closest('div[data-variant]')
        if (row) { row.click(); return }
      }
    }
  }, filename)
  await page.waitForTimeout(200)
  await page.evaluate(() => document.activeElement?.blur())
  await page.waitForTimeout(100)
}

async function trashSelected() {
  await page.keyboard.press('Delete')
  await page.waitForTimeout(500)
  await page.locator('button.trash-confirm-btn.confirm').waitFor({ state: 'visible', timeout: 3000 })
  await page.evaluate(() => {
    const btn = document.querySelector('button.trash-confirm-btn.confirm')
    if (btn) btn.click()
  })
  await page.waitForTimeout(300)
}

async function copySelected() {
  await page.keyboard.press('Control+c')
  await page.waitForTimeout(200)
}

async function pasteHere() {
  await page.keyboard.press('Control+v')
  await page.waitForTimeout(200)
}

async function waitWidget(ms = 100000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    if (await page.locator('.widget-button').count() > 0) return true
    await page.waitForTimeout(100)
  }
  return false
}

async function waitDone(ms = 100000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    const hasCheckmark = await page.evaluate(() => {
      return !!document.querySelector('.widget-button .checkmark')
    })
    if (hasCheckmark) return 'done'
    await page.waitForTimeout(100)
  }
  return null
}

async function openPopup() {
  await page.locator('.widget-button').waitFor({ state: 'visible', timeout: 10000 })
  await page.evaluate(() => {
    const btn = document.querySelector('.widget-button')
    if (btn) btn.click()
  })
  await page.waitForTimeout(400)
}

async function btns() {
  return await page.evaluate(() => {
    const r = {}
    document.querySelectorAll('.task-actions button').forEach(b => {
      const c = [...b.classList].filter(x => x.startsWith('action-') && x !== 'action-btn')
      if (c.length) r[c[0]] = true
    })
    return r
  })
}

async function taskStatus() {
  return await page.evaluate(() => {
    const el = document.querySelector('.task-footer span[data-status]')
    return el ? el.getAttribute('data-status') : null
  })
}

async function pollTaskStatus(expected, timeout = 30000) {
  await expect.poll(async () => {
    if (!(await page.locator('.popup').count())) {
      await page.evaluate(() => {
        const btn = document.querySelector('.widget-button')
        if (btn) btn.click()
      })
      await page.waitForTimeout(200)
    }
    return await taskStatus()
  }, { timeout }).toBe(expected)
}

async function taskStatusText() {
  return await page.evaluate(() => {
    const el = document.querySelector('.task-footer span[data-status]')
    return el ? el.textContent.trim() : null
  })
}

function big(kb) { return 'x'.repeat(kb * 1024) }

test.describe('Copy — active state', () => {
  test('cancel+pause buttons during copy', async () => {
    const src = await createTempDir('wa-src')
    const dst = await createTempDir('wa-dst')
    tempDirs.push(src, dst)
    await fsp.writeFile(path.join(src, 'big.bin'), big(500))

    await setup()
    await nav(src)
    await selectFile('big.bin')
    await copySelected()
    await nav(dst)
    await pasteHere()

    expect(await waitWidget()).toBe(true)
    await openPopup()
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-pause']).toBe(true)
    expect(await taskStatus()).toBe('active')
  })

  test('status text during copy', async () => {
    const src = await createTempDir('wl-src')
    const dst = await createTempDir('wl-dst')
    tempDirs.push(src, dst)
    await fsp.writeFile(path.join(src, 'label.bin'), big(500))

    await setup()
    await nav(src)
    await selectFile('label.bin')
    await copySelected()
    await nav(dst)
    await pasteHere()

    expect(await waitWidget()).toBe(true)
    await openPopup()
    const dataStatus = await taskStatus()
    expect(dataStatus).toBe('active')
  })

  test('progress bar during copy', async () => {
    const src = await createTempDir('wb-src')
    const dst = await createTempDir('wb-dst')
    tempDirs.push(src, dst)
    await fsp.writeFile(path.join(src, 'bar.bin'), big(500))

    await setup()
    await nav(src)
    await selectFile('bar.bin')
    await copySelected()
    await nav(dst)
    await pasteHere()

    expect(await waitWidget()).toBe(true)
    const eta = await page.locator('.eta').count()
    const bar = await page.locator('.bar-wrap').count()
    expect(eta + bar).toBeGreaterThan(0)
  })
})

test.describe('Copy — done state', () => {
  test('undo+folder after copy', async () => {
    const src = await createTempDir('wd-src')
    const dst = await createTempDir('wd-dst')
    tempDirs.push(src, dst)
    await createTempFiles(src, ['done.txt'])

    await setup()
    await nav(src)
    await selectFile('done.txt')
    await copySelected()
    await nav(dst)
    await pasteHere()

    expect(await waitDone()).toBeTruthy()
    await openPopup()
    const b = await btns()
    expect(b['action-undo']).toBe(true)
    expect(b['action-folder']).toBe(true)
  })

  test('checkmark after copy', async () => {
    const src = await createTempDir('wc-src')
    const dst = await createTempDir('wc-dst')
    tempDirs.push(src, dst)
    await createTempFiles(src, ['ck.txt'])

    await setup()
    await nav(src)
    await selectFile('ck.txt')
    await copySelected()
    await nav(dst)
    await pasteHere()

    expect(await waitDone()).toBeTruthy()
    expect(await page.locator('.widget-button .checkmark').count()).toBeGreaterThan(0)
  })

  test('undo removes file and task stays as undone', async () => {
    const src = await createTempDir('wu-src')
    const dst = await createTempDir('wu-dst')
    tempDirs.push(src, dst)
    await createTempFiles(src, ['undo.txt'])

    await setup()
    await nav(src)
    await selectFile('undo.txt')
    await copySelected()
    await nav(dst)
    await pasteHere()

    expect(await waitDone()).toBeTruthy()
    expect(await fileExists(path.join(dst, 'undo.txt'))).toBe(true)

    await openPopup()
    await page.locator('button.action-undo').waitFor({ state: 'visible', timeout: 2000 })
    await page.locator('button.action-undo').click()
    await page.waitForTimeout(2000)
    expect(await fileExists(path.join(dst, 'undo.txt'))).toBe(false)

    await openPopup()
    expect(await taskStatus()).toBe('undone')
    const statusText = await taskStatusText()
    expect(statusText).toBe('Undone')
    const widgetVisible = await page.locator('.widget-button').count()
    expect(widgetVisible).toBeGreaterThan(0)
  })
})

test.describe('Trash — done state', () => {
  test('undo+folder after trash', async () => {
    const src = await createTempDir('wtd-src')
    tempDirs.push(src)
    await createTempFiles(src, ['td.txt'])

    await setup()
    await nav(src)
    await selectFile('td.txt')
    await trashSelected()

    expect(await waitDone()).toBeTruthy()
    await openPopup()
    const b = await btns()
    expect(b['action-undo']).toBe(true)
    expect(b['action-folder']).toBe(true)
  })

  test('undo restores file', async () => {
    const src = await createTempDir('wtr-src')
    tempDirs.push(src)
    await createTempFiles(src, ['tr.txt'])

    await setup()
    await nav(src)
    await selectFile('tr.txt')
    await trashSelected()

    expect(await waitDone()).toBeTruthy()
    expect(await fileExists(path.join(src, 'tr.txt'))).toBe(false)

    await openPopup()
    await page.locator('button.action-undo').waitFor({ state: 'visible', timeout: 2000 })
    await page.locator('button.action-undo').click()
    await page.waitForTimeout(2000)
    expect(await fileExists(path.join(src, 'tr.txt'))).toBe(true)
  })

  test('checkmark after trash', async () => {
    const src = await createTempDir('wtc-src')
    tempDirs.push(src)
    await createTempFiles(src, ['tc.txt'])

    await setup()
    await nav(src)
    await selectFile('tc.txt')
    await trashSelected()

    expect(await waitDone()).toBeTruthy()
    expect(await page.locator('.widget-button .checkmark').count()).toBeGreaterThan(0)
  })
})

test.describe('Undo — throttling', () => {
  test('double undo click only restores the file once', async () => {
    const src = await createTempDir('wth-src')
    tempDirs.push(src)
    await createTempFiles(src, ['th.txt'])

    await setup()
    await nav(src)
    await selectFile('th.txt')
    await trashSelected()

    expect(await waitDone()).toBeTruthy()
    expect(await fileExists(path.join(src, 'th.txt'))).toBe(false)

    await openPopup()
    await page.locator('button.action-undo').waitFor({ state: 'visible', timeout: 2000 })
    await page.evaluate(() => {
      const btn = document.querySelector('button.action-undo')
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await expect.poll(async () => await fileExists(path.join(src, 'th.txt')), { timeout: 30000 }).toBe(true)
    await pollTaskStatus('undone')
  })
})

test.describe('Trash-restore — undo', () => {
  test('undo after restore moves the file back to trash', async () => {
    const srcDir = await createTempDir('wru-src')
    tempDirs.push(srcDir)
    const fileName = 'rt-' + Date.now() + '.txt'
    await createTempFiles(srcDir, [fileName])
    const originalPath = path.join(srcDir, fileName)

    await setup()

    await page.evaluate(async ({ originalPath }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [originalPath], 'setup-wru-1')
    }, { originalPath })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const entries = await fsp.readdir(trashFiles)
    const trashName = entries.find(e => e === fileName)
    expect(trashName).toBeDefined()

    await page.evaluate(async ({ trashName, originalPath }) => {
      await window.electron.ipcRenderer.invoke('trash-restore-items', [{ trashName, originalPath }], 'setup-wru-2')
    }, { trashName, originalPath })
    expect(await fileExists(originalPath)).toBe(true)

    await page.evaluate(({ trashName, originalPath, parentDir }) => {
      const t = window.__tasks.createTask('Restored ' + originalPath.split('/').pop() + ' from trash', {
        operation: 'trash-restore',
        trashNames: [trashName],
        originalPaths: [originalPath],
        parentDir,
        errorLog: []
      })
      window.__tasks.updateTask(t.id, { status: 'done', progress: 100, name: 'Restored from trash' })
    }, {
      trashName,
      originalPath,
      parentDir: srcDir,
    })

    expect(await waitWidget()).toBe(true)
    await openPopup()
    await page.locator('button.action-undo').waitFor({ state: 'visible', timeout: 2000 })
    await page.locator('button.action-undo').click()

    await expect.poll(async () => await fileExists(originalPath), { timeout: 30000 }).toBe(false)
    await pollTaskStatus('undone')
  })
})

test.describe('Copy — cancel during active', () => {
  test('cancel sets status to cancelled, shows folder only', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Copying big.bin…', {
        operation: 'copy',
        from: '/tmp/big.bin',
        to: '/tmp/dst',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('active')

    await page.evaluate(() => {
      const btn = document.querySelector('.action-cancel')
      if (btn) btn.click()
    })
    await page.waitForTimeout(500)
    expect(await taskStatus()).toBe('cancelled')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
  })
})

test.describe('Copy — pause/resume during active', () => {
  test('pause sets status to paused with resume button', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Copying big.bin…', {
        operation: 'copy',
        from: '/tmp/big.bin',
        to: '/tmp/dst',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()

    await page.evaluate(() => {
      const btn = document.querySelector('.action-pause')
      if (btn) btn.click()
    })
    await page.waitForTimeout(300)

    expect(await taskStatus()).toBe('paused')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-resume']).toBe(true)
  })

  test('resume after pause returns to active', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Copying big.bin…', {
        operation: 'copy',
        from: '/tmp/big.bin',
        to: '/tmp/dst',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()

    await page.evaluate(() => {
      const btn = document.querySelector('.action-pause')
      if (btn) btn.click()
    })
    await page.waitForTimeout(300)
    expect(await taskStatus()).toBe('paused')

    await page.evaluate(() => {
      const btn = document.querySelector('.action-resume')
      if (btn) btn.click()
    })
    await page.waitForTimeout(300)
    expect(await taskStatus()).toBe('active')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-pause']).toBe(true)
  })
})

test.describe('Copy — error state', () => {
  test('error task shows folder+retry buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Copying file.bin…', {
        operation: 'copy',
        from: '/tmp/file.bin',
        to: '/tmp/dst',
        errorLog: ['ENOENT: no such file']
      })
      window.__tasks.updateTask(t.id, { status: 'error', progress: 100, name: 'Copy failed' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('error')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-retry']).toBe(true)
  })
})

test.describe('Copy — cancelled state', () => {
  test('cancelled task shows folder button only', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Copying file.bin…', {
        operation: 'copy',
        from: '/tmp/file.bin',
        to: '/tmp/dst',
        errorLog: []
      })
      window.__tasks.cancelTask(t.id)
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('cancelled')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBeUndefined()
  })
})

test.describe('Partial state', () => {
  test('partial task shows folder+undo+retry-failed+info buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Copying files…', {
        operation: 'copy',
        from: '/tmp/src',
        to: '/tmp/dst',
        errorLog: ['Permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'partial', progress: 100, name: 'Copied (partial)' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('partial')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBe(true)
    expect(b['action-retry-failed']).toBe(true)
    expect(b['action-info']).toBe(true)
  })
})

test.describe('Info popup', () => {
  test('info button opens error log popup', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Copying files…', {
        operation: 'copy',
        from: '/tmp/src',
        to: '/tmp/dst',
        errorLog: ['ENOENT: no such file', 'EACCES: permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'partial', progress: 100, name: 'Copied (partial)' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()

    await page.evaluate(() => {
      const btn = document.querySelector('.action-info')
      if (btn) btn.click()
    })
    await page.waitForTimeout(400)

    const popupVisible = await page.evaluate(() => {
      return !!document.querySelector('.info-popup')
    })
    expect(popupVisible).toBe(true)

    const logEntries = await page.evaluate(() => {
      return document.querySelectorAll('.log-entry').length
    })
    expect(logEntries).toBe(2)
  })
})

test.describe('Copy — speed display', () => {
  test('speed text shown during active copy', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Copying speed.bin…', {
        operation: 'copy',
        from: '/tmp/speed.bin',
        to: '/tmp/dst',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const speed = await page.evaluate(() => {
      const el = document.querySelector('.task-speed')
      return el ? el.textContent.trim() : null
    })
    expect(speed).toBeTruthy()
  })
})

test.describe('Multiple tasks', () => {
  test('two tasks show in widget', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Copying a.bin…', {
        operation: 'copy',
        from: '/tmp/a.bin',
        to: '/tmp/dst',
        errorLog: []
      })
      window.__tasks.createTask('Moving to trash…', {
        operation: 'trash',
        from: '/tmp/b.bin',
        to: '~/.local/share/Trash/files',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const count = await page.evaluate(() => {
      return document.querySelectorAll('.task').length
    })
    expect(count).toBe(2)
  })
})

test.describe('Trash — active state', () => {
  test('trash task shows cancel+pause during active', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Moving to trash…', {
        operation: 'trash',
        from: '/tmp/big.bin',
        to: '~/.local/share/Trash/files',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-pause']).toBe(true)
    expect(await taskStatus()).toBe('active')
  })
})

test.describe('Trash — error state', () => {
  test('trash error shows folder+retry buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Moving to trash…', {
        operation: 'trash',
        from: '/tmp/file.bin',
        to: '~/.local/share/Trash/files',
        errorLog: ['Permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'error', progress: 100, name: 'Trash failed' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('error')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-retry']).toBe(true)
  })
})

test.describe('Trash — cancelled state', () => {
  test('trash cancelled shows folder button only', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Moving to trash…', {
        operation: 'trash',
        from: '/tmp/file.bin',
        to: '~/.local/share/Trash/files',
        errorLog: []
      })
      window.__tasks.cancelTask(t.id)
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('cancelled')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBeUndefined()
  })
})

test.describe('Trash — partial state', () => {
  test('trash partial shows folder+undo+retry-failed+info buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Moving to trash…', {
        operation: 'trash',
        from: '/tmp/src',
        to: '~/.local/share/Trash/files',
        errorLog: ['Permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'partial', progress: 100, name: 'Trashed (partial)' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('partial')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBe(true)
    expect(b['action-retry-failed']).toBe(true)
    expect(b['action-info']).toBe(true)
  })
})

test.describe('Trash-delete — active state', () => {
  test('trash-delete task shows cancel+pause during active', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Deleting from trash…', {
        operation: 'trash-delete',
        from: '/tmp/file.bin',
        to: '',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-pause']).toBe(true)
    expect(await taskStatus()).toBe('active')
  })
})

test.describe('Trash-delete — done state', () => {
  test('trash-delete done shows folder button only (no undo)', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Deleting from trash…', {
        operation: 'trash-delete',
        from: '/tmp/file.bin',
        to: '',
        originalPaths: ['/tmp/file.bin'],
        errorLog: []
      })
      window.__tasks.updateTask(t.id, { status: 'done', progress: 100, name: 'Deleted from trash' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('done')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBeUndefined()
  })
})

test.describe('Trash-delete — error state', () => {
  test('trash-delete error shows folder+retry buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Deleting from trash…', {
        operation: 'trash-delete',
        from: '/tmp/file.bin',
        to: '',
        errorLog: ['Permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'error', progress: 100, name: 'Delete failed' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('error')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-retry']).toBe(true)
  })
})

test.describe('Trash-delete — cancelled state', () => {
  test('trash-delete cancelled shows folder button only', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Deleting from trash…', {
        operation: 'trash-delete',
        from: '/tmp/file.bin',
        to: '',
        errorLog: []
      })
      window.__tasks.cancelTask(t.id)
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('cancelled')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBeUndefined()
  })
})

test.describe('Trash-delete — partial state', () => {
  test('trash-delete partial shows folder+retry-failed+info buttons (no undo)', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Deleting from trash…', {
        operation: 'trash-delete',
        from: '/tmp/src',
        to: '',
        originalPaths: ['/tmp/src'],
        errorLog: ['Permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'partial', progress: 100, name: 'Deleted (partial)' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('partial')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBeUndefined()
    expect(b['action-retry-failed']).toBe(true)
    expect(b['action-info']).toBe(true)
  })
})

test.describe('Trash-restore — active state', () => {
  test('trash-restore task shows cancel+pause during active', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Restoring from trash…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files/file.bin',
        to: '/tmp/file.bin',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-pause']).toBe(true)
    expect(await taskStatus()).toBe('active')
  })
})

test.describe('Trash-restore — done state', () => {
  test('trash-restore done shows folder+undo buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Restoring from trash…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files/file.bin',
        to: '/tmp/file.bin',
        errorLog: []
      })
      window.__tasks.updateTask(t.id, { status: 'done', progress: 100, name: 'Restored' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('done')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBe(true)
  })
})

test.describe('Trash-restore — error state', () => {
  test('trash-restore error shows folder+retry buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Restoring from trash…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files/file.bin',
        to: '/tmp/file.bin',
        errorLog: ['File not found in trash']
      })
      window.__tasks.updateTask(t.id, { status: 'error', progress: 100, name: 'Restore failed' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('error')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-retry']).toBe(true)
  })
})

test.describe('Trash-restore — cancelled state', () => {
  test('trash-restore cancelled shows folder button only', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Restoring from trash…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files/file.bin',
        to: '/tmp/file.bin',
        errorLog: []
      })
      window.__tasks.cancelTask(t.id)
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('cancelled')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBeUndefined()
  })
})

test.describe('Trash-restore — partial state', () => {
  test('trash-restore partial shows folder+undo+retry-failed+info buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Restoring from trash…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files',
        to: '/tmp',
        errorLog: ['Permission denied']
      })
      window.__tasks.updateTask(t.id, { status: 'partial', progress: 100, name: 'Restored (partial)' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('partial')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-undo']).toBe(true)
    expect(b['action-retry-failed']).toBe(true)
    expect(b['action-info']).toBe(true)
  })
})

test.describe('Cancel operation — active state', () => {
  test('cancel operation shows cancel button during progress', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Cancelling operation…', {
        operation: 'copy',
        from: '/tmp/src',
        to: '/tmp/dst',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('active')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-pause']).toBe(true)
  })

  test('cancel operation error shows folder+retry buttons', async () => {
    await setup()
    await page.evaluate(() => {
      const t = window.__tasks.createTask('Cancelling operation…', {
        operation: 'copy',
        from: '/tmp/src',
        to: '/tmp/dst',
        errorLog: ['Failed to cancel']
      })
      window.__tasks.updateTask(t.id, { status: 'error', progress: 100, name: 'Cancel failed' })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('error')
    const b = await btns()
    expect(b['action-folder']).toBe(true)
    expect(b['action-retry']).toBe(true)
  })
})

test.describe('Counting state', () => {
  test('copy counting shows cancel button', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Counting files…', {
        operation: 'copy',
        from: '/tmp/src',
        to: '/tmp/dst',
        errorLog: []
      })
      const task = window.__tasks.tasks[window.__tasks.tasks.length - 1]
      window.__tasks.updateTask(task.id, { status: 'counting', progress: 0 })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('counting')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-folder']).toBeUndefined()
    expect(b['action-retry']).toBeUndefined()
  })

  test('trash counting shows cancel button', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Counting files…', {
        operation: 'trash',
        from: '/tmp/src',
        to: '~/.local/share/Trash/files',
        errorLog: []
      })
      const task = window.__tasks.tasks[window.__tasks.tasks.length - 1]
      window.__tasks.updateTask(task.id, { status: 'counting', progress: 0 })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('counting')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-folder']).toBeUndefined()
  })

  test('trash-delete counting shows cancel button', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Counting files…', {
        operation: 'trash-delete',
        from: '/tmp/src',
        to: '',
        errorLog: []
      })
      const task = window.__tasks.tasks[window.__tasks.tasks.length - 1]
      window.__tasks.updateTask(task.id, { status: 'counting', progress: 0 })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('counting')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-folder']).toBeUndefined()
  })

  test('trash-restore counting shows cancel button', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Counting files…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files',
        to: '/tmp',
        errorLog: []
      })
      const task = window.__tasks.tasks[window.__tasks.tasks.length - 1]
      window.__tasks.updateTask(task.id, { status: 'counting', progress: 0 })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    expect(await taskStatus()).toBe('counting')
    const b = await btns()
    expect(b['action-cancel']).toBe(true)
    expect(b['action-folder']).toBeUndefined()
  })
})

test.describe('Operation icons', () => {
  test('trash-delete uses correct icon class', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Deleting from trash…', {
        operation: 'trash-delete',
        from: '/tmp/file.bin',
        to: '',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const hasIcon = await page.evaluate(() => {
      return !!document.querySelector('.op-trash-delete')
    })
    expect(hasIcon).toBe(true)
  })

  test('trash-restore uses correct icon class', async () => {
    await setup()
    await page.evaluate(() => {
      window.__tasks.createTask('Restoring from trash…', {
        operation: 'trash-restore',
        from: '~/.local/share/Trash/files/file.bin',
        to: '/tmp/file.bin',
        errorLog: []
      })
    })
    expect(await waitWidget()).toBe(true)
    await openPopup()
    const hasIcon = await page.evaluate(() => {
      return !!document.querySelector('.op-trash-restore')
    })
    expect(hasIcon).toBe(true)
  })
})
