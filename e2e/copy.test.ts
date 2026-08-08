import { test, expect, afterEach } from '@playwright/test'
import * as path from 'path'
import * as fsp from 'fs/promises'
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

test.describe('File copy via IPC', () => {
  test('copies a single file to destination', async () => {
    const srcDir = await createTempDir('copy-src')
    const destDir = await createTempDir('copy-dest')
    tempDirs.push(srcDir, destDir)
    await createTempFiles(srcDir, ['hello.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    const result = await window.evaluate(async ({ srcDir, destDir }) => {
      return await window.electron.ipcRenderer.invoke('file-copy', [srcDir + '/hello.txt'], destDir, 'test-task-1')
    }, { srcDir, destDir })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(1)

    const destFile = path.join(destDir, 'hello.txt')
    expect(await fileExists(destFile)).toBe(true)
    const content = await fsp.readFile(destFile, 'utf-8')
    expect(content).toBe('content of hello.txt')
  })

  test('copies multiple files', async () => {
    const srcDir = await createTempDir('copy-multi-src')
    const destDir = await createTempDir('copy-multi-dest')
    tempDirs.push(srcDir, destDir)
    await createTempFiles(srcDir, ['a.txt', 'b.txt', 'c.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    const result = await window.evaluate(async ({ srcDir, destDir }) => {
      return await window.electron.ipcRenderer.invoke('file-copy', [srcDir + '/a.txt', srcDir + '/b.txt', srcDir + '/c.txt'], destDir, 'test-task-2')
    }, { srcDir, destDir })

    expect(result.errors).toBe(0)
    expect(result.done).toBe(3)

    for (const name of ['a.txt', 'b.txt', 'c.txt']) {
      expect(await fileExists(path.join(destDir, name))).toBe(true)
    }
  })

  test('source file still exists after copy', async () => {
    const srcDir = await createTempDir('copy-keep-src')
    const destDir = await createTempDir('copy-keep-dest')
    tempDirs.push(srcDir, destDir)
    await createTempFiles(srcDir, ['original.txt'])

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    await window.evaluate(async ({ srcDir, destDir }) => {
      await window.electron.ipcRenderer.invoke('file-copy', [srcDir + '/original.txt'], destDir, 'test-task-3')
    }, { srcDir, destDir })

    expect(await fileExists(path.join(srcDir, 'original.txt'))).toBe(true)
    expect(await fileExists(path.join(destDir, 'original.txt'))).toBe(true)
  })

  test('reports errors for non-existent source', async () => {
    const destDir = await createTempDir('copy-err-dest')
    tempDirs.push(destDir)

    const launched = await launchApp()
    app = launched.app
    window = launched.window

    const result = await window.evaluate(async ({ destDir }) => {
      return await window.electron.ipcRenderer.invoke('file-copy', ['/nonexistent/file.txt'], destDir, 'test-task-4')
    }, { destDir })

    expect(result.errors).toBeGreaterThan(0)
  })
})
