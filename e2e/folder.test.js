const { test, expect, afterEach } = require('@playwright/test')
const path = require('path')
const fsp = require('fs/promises')
const os = require('os')
const { launchApp, createTempDir, createTempFiles, fileExists } = require('./helpers')

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

async function revealFile(dirPath, filename) {
  const found = await page.evaluate((filename) => {
    return [...document.querySelectorAll('.label')].some(l => l.textContent.includes(filename))
  }, filename)
  if (found) return
  const names = (await fsp.readdir(dirPath)).sort((a, b) => a.localeCompare(b))
  const index = names.findIndex(n => n === filename)
  if (index < 0) throw new Error('file not found in dir listing: ' + filename)
  const scrollState = await page.evaluate((index) => {
    const row = document.querySelector('.virtual-row')
    const rowHeight = row ? parseFloat(row.style.height) : 22
    const el = document.querySelector('.scroll-wrap .inner')
    if (el) el.scrollTop = Math.max(0, index * rowHeight - el.clientHeight / 2)
    return { rowHeight, clientHeight: el ? el.clientHeight : 0 }
  }, index)
  await page.waitForTimeout(400)
  const foundAfter = await page.evaluate((filename) => {
    return [...document.querySelectorAll('.label')].some(l => l.textContent.includes(filename))
  }, filename)
  if (!foundAfter) throw new Error('file not revealed in trash view: ' + filename)
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

async function currentAddress() {
  await page.evaluate(() => {
    const bc = document.querySelector('.breadcrumbs')
    if (bc) bc.click()
  })
  await page.waitForTimeout(300)
  const val = await page.evaluate(() => {
    const inp = document.querySelector('input.address')
    return inp ? inp.value : null
  })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  return val
}

async function selectedNames() {
  return await page.evaluate(() => {
    const rows = document.querySelectorAll('div[data-variant][data-selected="true"]')
    const names = []
    rows.forEach(r => {
      const label = r.querySelector('.label')
      if (label) names.push(label.textContent.trim())
    })
    return names
  })
}

async function waitTask(op, status, timeout = 30000) {
  await expect.poll(async () => {
    const st = await page.evaluate((op) => {
      const t = window.__tasks.tasks.find(x => x.data && x.data.operation === op)
      return t ? t.status : null
    }, op)
    return st
  }, { timeout }).toBe(status)
}

async function clickFolder(namePart) {
  await page.locator('.task').first().waitFor({ state: 'visible', timeout: 2000 })
  await page.evaluate((namePart) => {
    const rows = [...document.querySelectorAll('.task')]
    const target = namePart
      ? rows.find(r => r.querySelector('.task-name')?.textContent.includes(namePart))
      : rows[0]
    const btn = target && target.querySelector('button.action-folder')
    if (btn) btn.click()
  }, namePart)
  await page.waitForTimeout(2500)
}

const ts = () => Date.now()

test('folder after copy shows dest file', async () => {
  const src = await createTempDir('pf-src')
  const dst = await createTempDir('pf-dst')
  tempDirs.push(src, dst)
  const file = `copy-me-${ts()}.txt`
  await createTempFiles(src, [file])

  await setup()
  await nav(src)
  await selectFile(file)
  await copySelected()
  await nav(dst)
  await pasteHere()
  expect(await waitDone()).toBeTruthy()

  await openPopup()
  await clickFolder()
  expect(await currentAddress()).toBe(dst)
  expect(await selectedNames()).toContain(file)
})

test('folder after move shows dest file', async () => {
  const src = await createTempDir('pm-src')
  const dst = await createTempDir('pm-dst')
  tempDirs.push(src, dst)
  const file = `move-me-${ts()}.txt`
  await createTempFiles(src, [file])

  await setup()
  await nav(src)
  await selectFile(file)
  await page.keyboard.press('Control+x')
  await page.waitForTimeout(300)
  await nav(dst)
  await pasteHere()
  expect(await waitDone()).toBeTruthy()

  await openPopup()
  await clickFolder()
  expect(await currentAddress()).toBe(dst)
  expect(await selectedNames()).toContain(file)
})

test('folder after move undo shows original file', async () => {
  const src = await createTempDir('pu-src')
  const dst = await createTempDir('pu-dst')
  tempDirs.push(src, dst)
  const file = `unmove-${ts()}.txt`
  await createTempFiles(src, [file])

  await setup()
  await nav(src)
  await selectFile(file)
  await page.keyboard.press('Control+x')
  await page.waitForTimeout(300)
  await nav(dst)
  await pasteHere()
  expect(await waitDone()).toBeTruthy()

  await openPopup()
  await page.locator('button.action-undo').waitFor({ state: 'visible', timeout: 2000 })
  await page.locator('button.action-undo').click()
  await waitTask('move', 'undone')
  expect(await fileExists(path.join(src, file))).toBe(true)

  await openPopup()
  await clickFolder()
  expect(await currentAddress()).toBe(src)
  expect(await selectedNames()).toContain(file)
})

test('folder after trash shows file in trash', async () => {
  const src = await createTempDir('pt-src')
  tempDirs.push(src)
  const file = `trash-me-${ts()}.txt`
  await createTempFiles(src, [file])

  await setup()
  await nav(src)
  await selectFile(file)
  await trashSelected()
  expect(await waitDone()).toBeTruthy()

  await openPopup()
  await clickFolder()
  const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
  expect(await currentAddress()).toBe(trashFiles)
  await expect.poll(async () => (await selectedNames()).length, { timeout: 10000 }).toBeGreaterThan(0)
  const names = await selectedNames()
  expect(names.some(n => n.includes(file))).toBe(true)
})

test('folder after trash-delete navigates to trash dir', async () => {
  const src = await createTempDir('pd-src')
  tempDirs.push(src)
  const file = `trash-del-${ts()}.txt`
  await createTempFiles(src, [file])

  await setup()
  await nav(src)
  await selectFile(file)
  await trashSelected()
  expect(await waitDone()).toBeTruthy()

  const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
  await nav(trashFiles)
  await revealFile(trashFiles, file)
  await selectFile(file)
  const selected = await selectedNames()
  expect(selected.some(n => n.includes(file))).toBe(true)
  await page.locator('button.trash-btn.delete').waitFor({ state: 'visible', timeout: 3000 })
  await page.evaluate(() => {
    const btn = document.querySelector('button.trash-btn.delete')
    if (btn) btn.click()
  })
  await page.waitForTimeout(500)
  await page.locator('button.trash-confirm-btn.confirm').waitFor({ state: 'visible', timeout: 3000 })
  await page.evaluate(() => {
    const btn = document.querySelector('button.trash-confirm-btn.confirm')
    if (btn) btn.click()
  })
  await waitTask('trash-delete', 'done')

  await openPopup()
  await clickFolder()
  expect(await currentAddress()).toBe(trashFiles)
})

test('folder after trash-restore shows original file', async () => {
  const srcDir = await createTempDir('pr-src')
  tempDirs.push(srcDir)
  const file = `restore-me-${ts()}.txt`
  await createTempFiles(srcDir, [file])

  await setup()
  await nav(srcDir)
  await selectFile(file)
  await trashSelected()
  expect(await waitDone()).toBeTruthy()

  await nav(path.join(os.homedir(), '.local', 'share', 'Trash', 'files'))
  await revealFile(path.join(os.homedir(), '.local', 'share', 'Trash', 'files'), file)
  await selectFile(file)
  await page.locator('button.trash-btn.restore').waitFor({ state: 'visible', timeout: 3000 })
  await page.evaluate(() => {
    const btn = document.querySelector('button.trash-btn.restore')
    if (btn) btn.click()
  })
  await page.waitForTimeout(500)
  await page.locator('button.trash-confirm-btn.confirm').waitFor({ state: 'visible', timeout: 3000 })
  await page.evaluate(() => {
    const btn = document.querySelector('button.trash-confirm-btn.confirm')
    if (btn) btn.click()
  })
  await waitTask('trash-restore', 'done')

  await openPopup()
  await clickFolder('Restore')
  expect(await currentAddress()).toBe(srcDir)
  expect(await selectedNames()).toContain(file)
})

test('folder after copy undo shows source file', async () => {
  const src = await createTempDir('cu-src')
  const dst = await createTempDir('cu-dst')
  tempDirs.push(src, dst)
  const file = `uncopy-${ts()}.txt`
  await createTempFiles(src, [file])

  await setup()
  await nav(src)
  await selectFile(file)
  await copySelected()
  await nav(dst)
  await pasteHere()
  expect(await waitDone()).toBeTruthy()

  await openPopup()
  await page.locator('button.action-undo').waitFor({ state: 'visible', timeout: 2000 })
  await page.locator('button.action-undo').click()
  await waitTask('copy', 'undone')
  expect(await fileExists(path.join(dst, file))).toBe(false)

  await openPopup()
  await clickFolder()
  expect(await currentAddress()).toBe(src)
  expect(await selectedNames()).toContain(file)
})

test('folder after cancelled copy shows source file', async () => {
  const src = await createTempDir('cc-src')
  const dst = await createTempDir('cc-dst')
  tempDirs.push(src, dst)
  const file = `cancel-me-${ts()}.txt`
  const many = Array.from({ length: 10 }, (_, i) => `cancel-${ts()}-${i}.txt`)
  await createTempFiles(src, [...many, file])

  await setup()
  await nav(src)
  await selectFile(file)
  await copySelected()
  await nav(dst)
  await pasteHere()

  await page.locator('.widget-button').waitFor({ state: 'visible', timeout: 10000 })
  await openPopup()
  const cancelBtn = page.locator('button.action-cancel')
  if (await cancelBtn.count()) {
    await cancelBtn.first().click()
  }
  await waitTask('copy', 'cancelled')

  await openPopup()
  await clickFolder()
  expect(await currentAddress()).toBe(src)
  const names = await selectedNames()
  expect(names.some(n => n.includes(file))).toBe(true)
  expect(await fileExists(path.join(dst, file))).toBe(false)
})
