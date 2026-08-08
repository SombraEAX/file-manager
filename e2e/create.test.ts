import { test, expect, afterEach } from '@playwright/test'
import * as path from 'path'
import * as fsp from 'fs/promises'
import { launchApp, createTempDir, fileExists } from './helpers'

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

async function replyToContextMenu(index) {
  await app.evaluate(({ ipcMain }, idx) => {
    ipcMain.removeAllListeners('show-menu')
    ipcMain.on('show-menu', (event) => {
      event.reply('show-menu-reply', idx)
    })
  }, index)
}

async function backgroundRightClick() {
  const box = await page.locator('.scroll-wrap .inner').boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 30, { button: 'right' })
  await page.waitForTimeout(300)
}

test('context menu New folder creates folder and renames inline', async () => {
  const base = await createTempDir('mk-folder')
  tempDirs.push(base)
  const anchor = path.join(base, 'existing')
  await fsp.mkdir(anchor)

  await setup()
  await replyToContextMenu(0)
  await nav(base)

  await backgroundRightClick()
  await page.waitForTimeout(2000)

  expect(await fileExists(path.join(base, 'New folder'))).toBe(true)
  const input = page.locator('.rename-input').first()
  await input.waitFor({ state: 'visible', timeout: 10000 })

  await input.fill('renamed folder')
  await input.press('Enter')
  await page.waitForTimeout(2000)

  expect(await fileExists(path.join(base, 'renamed folder'))).toBe(true)
  expect(await fileExists(path.join(base, 'New folder'))).toBe(false)
})

test('context menu New file creates file and rename can be cancelled', async () => {
  const base = await createTempDir('mk-file')
  tempDirs.push(base)
  const anchor = path.join(base, 'existing')
  await fsp.mkdir(anchor)

  await setup()
  await replyToContextMenu(1)
  await nav(base)

  await backgroundRightClick()
  await page.waitForTimeout(2000)

  expect(await fileExists(path.join(base, 'New file'))).toBe(true)
  const input = page.locator('.rename-input').first()
  await input.waitFor({ state: 'visible', timeout: 10000 })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)

  expect(await fileExists(path.join(base, 'New file'))).toBe(true)
  const content = await fsp.readFile(path.join(base, 'New file'), 'utf8').catch(() => null)
  expect(content).toBe('')
})

test('context menu New folder picks a unique name when New folder exists', async () => {
  const base = await createTempDir('mk-folder2')
  tempDirs.push(base)
  await fsp.mkdir(path.join(base, 'New folder'))
  const anchor = path.join(base, 'existing')
  await fsp.mkdir(anchor)

  await setup()
  await replyToContextMenu(0)
  await nav(base)

  await backgroundRightClick()
  await page.waitForTimeout(2000)

  expect(await fileExists(path.join(base, 'New folder (2)'))).toBe(true)
  await page.keyboard.press('Escape')
})
