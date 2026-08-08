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

test.describe('Restore from trash', () => {
  test('restores a file to original location', async () => {
    const srcDir = await createTempDir('restore-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['restored.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/restored.txt'], 'setup-restore-1')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashEntries = await fsp.readdir(trashFiles)
    const trashName = trashEntries.find(e => e.startsWith('restored'))
    expect(trashName).toBeDefined()
    const originalPath = path.join(srcDir, 'restored.txt')
    expect(await fileExists(originalPath)).toBe(false)

    const result = await window.evaluate(async ({ trashName, originalPath }) => {
      return await window.electron.ipcRenderer.invoke('trash-restore-items', [
        { trashName, originalPath }
      ], 'test-restore-1')
    }, { trashName, originalPath })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(1)
    expect(await fileExists(originalPath)).toBe(true)
    const content = await fsp.readFile(originalPath, 'utf-8')
    expect(content).toBe('content of restored.txt')
  })

  test('restores multiple files', async () => {
    const srcDir = await createTempDir('restore-multi-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['r1.txt', 'r2.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/r1.txt'], 'setup-restore-2a')
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/r2.txt'], 'setup-restore-2b')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashEntries = await fsp.readdir(trashFiles)
    const item1Name = trashEntries.find(e => e.startsWith('r1'))
    const item2Name = trashEntries.find(e => e.startsWith('r2'))

    const result = await window.evaluate(async (items) => {
      return await window.electron.ipcRenderer.invoke('trash-restore-items', items, 'test-restore-2')
    }, [
      { trashName: item1Name, originalPath: path.join(srcDir, 'r1.txt') },
      { trashName: item2Name, originalPath: path.join(srcDir, 'r2.txt') }
    ])

    expect(result.errors).toBe(0)
    expect(result.done).toBe(2)
    expect(await fileExists(path.join(srcDir, 'r1.txt'))).toBe(true)
    expect(await fileExists(path.join(srcDir, 'r2.txt'))).toBe(true)
  })

  test('restored file is removed from trash', async () => {
    const srcDir = await createTempDir('restore-clean-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['clean-me.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/clean-me.txt'], 'setup-restore-3')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashEntries = await fsp.readdir(trashFiles)
    const trashName = trashEntries.find(e => e.startsWith('clean-me'))
    const originalPath = path.join(srcDir, 'clean-me.txt')

    await window.evaluate(async ({ trashName, originalPath }) => {
      await window.electron.ipcRenderer.invoke('trash-restore-items', [
        { trashName, originalPath }
      ], 'test-restore-3')
    }, { trashName, originalPath })

    expect(await fileExists(path.join(trashFiles, trashName))).toBe(false)
  })

  test('.trashinfo removed after restore', async () => {
    const srcDir = await createTempDir('restore-info-src')
    tempDirs.push(srcDir)
    await createTempFiles(srcDir, ['info-check.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir }) => {
      await window.electron.ipcRenderer.invoke('trash-items', [srcDir + '/info-check.txt'], 'setup-restore-4')
    }, { srcDir })

    const trashFiles = path.join(os.homedir(), '.local', 'share', 'Trash', 'files')
    const trashInfo = path.join(os.homedir(), '.local', 'share', 'Trash', 'info')
    const trashEntries = await fsp.readdir(trashFiles)
    const trashName = trashEntries.find(e => e.startsWith('info-check'))
    const originalPath = path.join(srcDir, 'info-check.txt')
    const infoPath = path.join(trashInfo, trashName + '.trashinfo')
    expect(await fileExists(infoPath)).toBe(true)

    await window.evaluate(async ({ trashName, originalPath }) => {
      await window.electron.ipcRenderer.invoke('trash-restore-items', [
        { trashName, originalPath }
      ], 'test-restore-4')
    }, { trashName, originalPath })

    expect(await fileExists(infoPath)).toBe(false)
  })
})
