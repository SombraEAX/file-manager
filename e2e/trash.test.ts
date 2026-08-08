import { test, expect, afterEach } from '@playwright/test'
import * as path from 'path'
import * as fsp from 'fs/promises'
import * as os from 'os'
import { launchApp, createTempDir, createTempFiles, fileExists, readTrashInfo } from './helpers'

let app, window
let tempDirs = []

afterEach(async () => {
  if (app) await app.close().catch(() => {})
  for (const dir of tempDirs) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
  tempDirs = []
  app = null
  window = null
})

test.describe('Move to trash', () => {
  test('moves a file to trash', async () => {
    const srcDir = await createTempDir('trash-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['discard.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    const result = await window.evaluate(async ({ srcDir }) => {
      return await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/discard.txt'], 'test-trash-1')
    }, { srcDir })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(1)
    expect(await fileExists(path.join(srcDir, 'discard.txt'))).toBe(false)

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashEntries = await fsp.readdir(trashFiles)
    const trashedFile = trashEntries.find(e => e.startsWith('discard'))
    expect(trashedFile).toBeDefined()
  })

  test('creates .trashinfo with original path', async () => {
    const srcDir = await createTempDir('trashinfo-src')
    tempDirs.push(srcDir)
    const uniqueName = 'tracked-' + Date.now() + '.txt'
    await createTempFiles(srcDir, [uniqueName])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir, uniqueName }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/' + uniqueName], 'test-trash-2')
    }, { srcDir, uniqueName })

    const originalPath = await readTrashInfo(uniqueName)
    expect(originalPath).toBe(path.join(srcDir, uniqueName))
  })

  test('moves multiple files to trash', async () => {
    const srcDir = await createTempDir('trash-multi-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['x.txt', 'y.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    const result = await window.evaluate(async ({ srcDir }) => {
      return await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/x.txt', srcDir + '/y.txt'], 'test-trash-3')
    }, { srcDir })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(2)
    expect(await fileExists(path.join(srcDir, 'x.txt'))).toBe(false)
    expect(await fileExists(path.join(srcDir, 'y.txt'))).toBe(false)
  })
})
