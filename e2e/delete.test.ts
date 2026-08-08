import { test, expect, afterEach } from '@playwright/test'
import * as path from 'path'
import * as fsp from 'fs/promises'
import * as os from 'os'
import { launchApp, createTempDir, createTempFiles, fileExists } from './helpers'

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

test.describe('Permanent delete from trash', () => {
  test('deletes file from trash permanently', async () => {
    const srcDir = await createTempDir('del-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['gone.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/gone.txt'], 'setup-del-1')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashEntries = await fsp.readdir(trashFiles)
    const trashName = trashEntries.find(e => e.startsWith('gone'))
    expect(trashName).toBeDefined()
    const trashPath = path.join(trashFiles, trashName)

    const result = await window.evaluate(async ({ trashPath }) => {
      return await window.electron.ipcRenderer.invoke('trash-permanent-delete', [trashPath], 'test-del-1')
    }, { trashPath })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(1)
    expect(await fileExists(trashPath)).toBe(false)
  })

  test('removes .trashinfo after permanent delete', async () => {
    const srcDir = await createTempDir('del-info-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['info-file.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/info-file.txt'], 'setup-del-2')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashInfo = path.join(os.homedir(), '.local', 'share', 'Trash', 'info')
    const trashEntries = await fsp.readdir(trashFiles)
    const trashName = trashEntries.find(e => e.startsWith('info-file'))
    const trashPath = path.join(trashFiles, trashName)
    const infoPath = path.join(trashInfo, trashName + '.trashinfo')
    expect(await fileExists(infoPath)).toBe(true)

    await window.evaluate(async ({ trashPath }) => {
      await window.electron.ipcRenderer.invoke('trash-permanent-delete', [trashPath], 'test-del-2')
    }, { trashPath })

    expect(await fileExists(trashPath)).toBe(false)
    expect(await fileExists(infoPath)).toBe(false)
  })

  test('deletes multiple files from trash', async () => {
    const srcDir = await createTempDir('del-multi-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['d1.txt', 'd2.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/d1.txt'], 'setup-del-3a')
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/d2.txt'], 'setup-del-3b')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const entries = await fsp.readdir(trashFiles)
    const toDelete = entries.filter(e => e.startsWith('d1') || e.startsWith('d2')).map(e => path.join(trashFiles, e))

    const result = await window.evaluate(async ({ toDelete }) => {
      return await window.electron.ipcRenderer.invoke('trash-permanent-delete', toDelete, 'test-del-3')
    }, { toDelete })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(2)
    for (const p of toDelete) {
      expect(await fileExists(p)).toBe(false)
    }
  })
})

test.describe('Copy undo (delete copied files)', () => {
  test('deletes copied file via copy-undo', async () => {
    const srcDir = await createTempDir('undo-src')
    const destDir = await createTempDir('undo-dest')
    tempDirs.push(srcDir, destDir)
    await createTempFiles(srcDir, ['undo-me.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    const copyResult = await window.evaluate(async ({ srcDir, destDir }) => {
      return await window.electron.ipcRenderer.invoke('file-copy', [srcDir + '/undo-me.txt'], destDir, 'test-copy-undo')
    }, { srcDir, destDir })

    expect(copyResult.errors).toBe(0)
    expect(await fileExists(path.join(destDir, 'undo-me.txt'))).toBe(true)

    const undoResult = await window.evaluate(async ({ destDir }) => {
      return await window.electron.ipcRenderer.invoke('copy-undo', [destDir + '/undo-me.txt'], 'test-undo-1')
    }, { destDir })

    expect(undoResult.errors).toBe(0)
    expect(undoResult.done).toBe(1)
    expect(await fileExists(path.join(destDir, 'undo-me.txt'))).toBe(false)
  })
})
