import { test, expect, afterEach } from '@playwright/test'
import * as path from 'path'
import * as fsp from 'fs/promises'
import { launchApp, createTempDir } from './helpers'

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
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const bc = document.querySelector('.breadcrumbs')
      if (bc) bc.click()
    })
    await page.waitForTimeout(600)
    if (await page.locator('input.address').isVisible().catch(() => false)) break
  }
  const input = page.locator('input.address')
  await input.waitFor({ state: 'visible', timeout: 10000 })
  await input.fill(dirPath)
  await input.press('Enter', { noWaitAfter: true })
  await page.waitForTimeout(2000)
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

async function toastText() {
  return await page.evaluate(() => {
    const t = document.querySelector('.toast')
    return t ? t.textContent : ''
  })
}

function folderRow(name) {
  return page.locator('div[data-variant]').filter({ hasText: name }).first()
}

test('double-click folder opens without Folder not found toast', async () => {
  const base = await createTempDir('real-dbl')
  tempDirs.push(base)
  const sub = path.join(base, 'subfolder')
  const inner = path.join(sub, 'inner')
  const subsub = path.join(sub, 'subfolder')
  await fsp.mkdir(inner, { recursive: true })
  await fsp.mkdir(subsub, { recursive: true })

  await setup()
  await nav(base)

  await folderRow('subfolder').click({ clickCount: 2, delay: 90 })
  await page.waitForTimeout(1500)
  expect(await currentAddress()).toBe(sub)
  expect(await toastText()).not.toContain('Folder not found')

  await folderRow('inner').click({ clickCount: 2, delay: 90 })
  await page.waitForTimeout(1500)
  expect(await currentAddress()).toBe(inner)
  expect(await toastText()).not.toContain('Folder not found')
})

test('double-click same-name nested folder shows no toast', async () => {
  const base = await createTempDir('real-dbl2')
  tempDirs.push(base)
  const sub = path.join(base, 'subfolder')
  const subsub = path.join(sub, 'subfolder')
  await fsp.mkdir(subsub, { recursive: true })

  await setup()
  await nav(base)

  await folderRow('subfolder').click({ clickCount: 2, delay: 90 })
  await page.waitForTimeout(1500)
  expect(await currentAddress()).toBe(sub)

  await folderRow('subfolder').click({ clickCount: 2, delay: 90 })
  await page.waitForTimeout(1500)
  expect(await currentAddress()).toBe(subsub)
  expect(await toastText()).not.toContain('Folder not found')
})

test('context menu Open navigates to folder without toast', async () => {
  const base = await createTempDir('ctx-open')
  tempDirs.push(base)
  const sub = path.join(base, 'ctxsub')
  await fsp.mkdir(sub)

  await setup()
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeAllListeners('show-menu')
    ipcMain.on('show-menu', (event) => {
      event.reply('show-menu-reply', 0)
    })
  })

  await nav(base)
  await folderRow('ctxsub').click({ button: 'right' })
  await page.waitForTimeout(1500)

  expect(await currentAddress()).toBe(sub)
  expect(await toastText()).not.toContain('Folder not found')
})
