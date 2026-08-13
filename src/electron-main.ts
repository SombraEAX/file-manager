import { app, BrowserWindow, ipcMain, Menu, MenuItem, clipboard, dialog, shell, nativeImage } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { spawn } from 'child_process'
import { createHash } from 'crypto'
import * as url from 'url'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import type { MenuItemSpec, MenuRequest, HistoryMenuRequest, TrashItem, MoveUndoItem } from './types/ipc'

const isDev = process.env.NODE_ENV === 'development'
const SLOW_FS = process.env.SLOW_FS === '1'

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function errCode(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null) return undefined
  const code = (e as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

console.log('[fs-sim] SLOW_FS throttling =', SLOW_FS, "(enable with SLOW_FS=1)")

let mainWindow: BrowserWindow | null = null

const APP_ICON_PATH = path.join(
  __dirname,
  isDev ? '../public/icons/256.png' : '../dist/icons/256.png'
)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Sombra Manager',
    icon: APP_ICON_PATH,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const localPath = url.format({
    pathname: path.join(__dirname, `../dist/index.html`),
    protocol: "file:",
    slashes: true
  })
  const urlAddress = isDev ? 'http://localhost:8081/' : localPath
  mainWindow.loadURL(urlAddress)

  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null
  })

}

app.on('ready', () => {
  Menu.setApplicationMenu(null)
  if (process.platform === 'darwin') {
    app.dock?.setIcon(nativeImage.createFromPath(APP_ICON_PATH))
  }
  createWindow()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

ipcMain.on('show-menu-bar-submenu', (event, { items, x, y }: MenuRequest) => {
  function buildMenu(items: MenuItemSpec[]): Menu {
    const menu = new Menu()
    items.forEach((item: MenuItemSpec) => {
      if (item.visible == false) return
      if (item.submenu) {
        menu.append(new MenuItem({ label: item.label, submenu: buildMenu(item.submenu) }))
      } else {
        const opts: MenuItemConstructorOptions = {}
        if (item.role) {
          opts.role = item.role as MenuItemConstructorOptions['role']
        } else {
          opts.type = item.type || 'normal'
          opts.label = item.label
          if (item.checked !== undefined) opts.checked = item.checked
          if (item.enabled !== undefined) opts.enabled = item.enabled
        }
        if (item.id) opts.click = () => event.reply('show-menu-bar-submenu-reply', item.id)
        let menuItem
        try {
          menuItem = new MenuItem(opts)
        } catch (e) {
          console.log('create menu item error:', e)
          throw e
        }
        try {
          menu.append(menuItem)
        } catch (e) {
          console.log('menu item append error:', e)
          throw e
        }
      }
    })
    return menu
  }
  const menu = buildMenu(items)
  menu.popup({ window: mainWindow || undefined, x: Math.floor(x), y: Math.floor(y) })
})

ipcMain.on('show-menu', (event, { items, x, y }: MenuRequest) => {
  const menu = new Menu()

  items.forEach((item: MenuItemSpec, index: number) => {
    const opts: MenuItemConstructorOptions = {}
    if (item.role) {
      opts.role = item.role as MenuItemConstructorOptions['role']
    } else {
      opts.type = item.type || 'normal'
      opts.label = item.label
      if (item.checked !== undefined) opts.checked = item.checked
    }
    opts.click = () => event.reply('show-menu-reply', index)
    menu.append(new MenuItem(opts))
  })

  menu.popup({ window: mainWindow || undefined, x, y })
})

ipcMain.on('copy-to-clipboard', (event, text: string) => {
  clipboard.writeText(text);
});

ipcMain.on('open-external', (event, url: string) => {
  shell.openExternal(url)
});

ipcMain.handle('get-from-clipboard', () => {
  return clipboard.readText(); 
});

ipcMain.handle('open-directory-dialog', async () => {
  const win = mainWindow
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

function openWithSystemHandler(pathname: string): Promise<string> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const command = process.platform === 'darwin' ? 'open'
      : isWin ? 'cmd'
      : 'xdg-open'
    const args = process.platform === 'darwin' ? [pathname]
      : isWin ? ['/c', 'start', '', pathname]
      : [pathname]
    const child = spawn(command, args, {
      detached: !isWin,
      stdio: ['ignore', 'ignore', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    let settled = false
    const settle = (msg: string) => {
      if (settled) return
      settled = true
      resolve(msg)
    }
    child.on('error', (e: Error) => settle(e.message || String(e)))
    child.on('exit', (code) => {
      settle(code === 0 ? '' : (stderr.trim() || `Failed to open (exit code ${code})`))
    })
    setTimeout(() => settle(''), 3000)
  })
}

ipcMain.handle('open-file', async (event, pathname: string) => {
  let error = ''
  try {
    error = await openWithSystemHandler(pathname)
  } catch (e) {
    error = errMessage(e)
  }
  return { error }
});

ipcMain.on('show-history-menu', (event, { history, current, x, y }: HistoryMenuRequest) => {
  const menu = new Menu()

  history.forEach((pathname: string, index: number) =>
    menu.append(new MenuItem({
      checked: index == current,
      type:    'radio',
      label:   pathname,
      click: () => event.reply('show-history-menu-reply', index)
    }))
  )

  menu.popup({ window: mainWindow || undefined, x, y })
})

async function copyWithProgress(src: string, dest: string, onBytesCopied: (bytes: number) => void, taskId?: string | number) {
  const rs = fs.createReadStream(src, SLOW_FS ? { highWaterMark: 8 * 1024 * 1024 } : undefined)
  const ws = fs.createWriteStream(dest)
  let totalCopied = 0
  const finished = new Promise<void>((resolve, reject) => {
    ws.on('finish', () => resolve())
    ws.on('error', reject)
  })
  try {
    for await (const chunk of rs) {
      await waitWhilePausedOrCancelled(taskId)
      if (taskId && cancelledTasks.has(taskId)) throw new Error('cancelled')
      totalCopied += chunk.length
      onBytesCopied(totalCopied)
      if (!ws.write(chunk)) {
        await new Promise<void>((resolve) => ws.once('drain', () => resolve()))
      }
      if (SLOW_FS) await new Promise((r) => setTimeout(r, 1000))
    }
    ws.end()
    await finished
    if (SLOW_FS && totalCopied === 0) await new Promise((r) => setTimeout(r, 1000))
  } catch (e) {
    rs.destroy()
    ws.destroy()
    finished.catch(() => {})
    throw e
  }
}

async function copyDirWithProgress(src: string, dest: string, onBytesCopied: (bytes: number) => void, taskId?: string | number) {
  await fsp.mkdir(dest, { recursive: true })
  const entries = await fsp.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    await waitWhilePausedOrCancelled(taskId)
    if (taskId && cancelledTasks.has(taskId)) throw new Error('cancelled')
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirWithProgress(srcPath, destPath, onBytesCopied, taskId)
    } else {
      await copyWithProgress(srcPath, destPath, onBytesCopied, taskId)
    }
  }
}

async function moveToTrash(filePath: string, onBytesCopied?: (bytes: number) => void, taskId?: string | number) {
  const trashDir = path.join(os.homedir(), '.local', 'share', 'Trash')
  const trashFiles = path.join(trashDir, 'files')
  const trashInfo = path.join(trashDir, 'info')

  await fsp.mkdir(trashFiles, { recursive: true })
  await fsp.mkdir(trashInfo, { recursive: true })

  const stat = await fsp.stat(filePath)

  const baseName = path.basename(filePath)
  let destName = baseName
  let counter = 1
  while (true) {
    try {
      await fsp.access(path.join(trashFiles, destName))
      const ext = path.extname(baseName)
      const stem = path.basename(baseName, ext)
      destName = `${stem} (${counter})${ext}`
      counter++
    } catch (e) {
      break
    }
  }

  const destPath = path.join(trashFiles, destName)

  if (SLOW_FS) {
    if (stat.isDirectory()) {
      await copyDirWithProgress(filePath, destPath, onBytesCopied || (() => {}), taskId)
    } else {
      await copyWithProgress(filePath, destPath, onBytesCopied || (() => {}), taskId)
    }
    await fsp.rm(filePath, { recursive: true })
  } else {
    try {
      await fsp.rename(filePath, destPath)
    } catch (e) {
      if (errCode(e) === 'EXDEV') {
        if (stat.isDirectory()) {
          await copyDirWithProgress(filePath, destPath, onBytesCopied || (() => {}), taskId)
        } else {
          await copyWithProgress(filePath, destPath, onBytesCopied || (() => {}), taskId)
        }
        await fsp.rm(filePath, { recursive: true })
      } else {
        throw e
      }
    }
  }

  const now = new Date()
  const dateStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0')

  const infoContent = `[Trash Info]\nPath=${filePath}\nDeletionDate=${dateStr}\n`
  await fsp.writeFile(path.join(trashInfo, destName + '.trashinfo'), infoContent, 'utf-8')
  return { trashName: destName }
}

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0
  const entries = await fsp.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      size += await getDirSize(fullPath)
    } else {
      const stat = await fsp.stat(fullPath)
      size += stat.size
    }
  }
  return size
}

async function getDirInfo(dirPath: string): Promise<{ size: number; count: number }> {
  let size = 0
  let count = 0
  const entries = await fsp.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const info = await getDirInfo(fullPath)
      size += info.size
      count += info.count + 1
    } else {
      const stat = await fsp.stat(fullPath)
      size += stat.size
      count++
    }
  }
  return { size, count }
}

const THUMB_BASE = path.join(os.homedir(), '.cache', 'thumbnails')
const THUMB_DIRS: Record<number, string> = { 128: 'normal', 256: 'large', 512: 'x-large' }
const THEMES_DIR = path.join(__dirname, '../themes')

function crc32(buf: Buffer): number {
  let c: number
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function insertTextChunks(png: Buffer, chunks: [string, string][]): Buffer {
  let offset = 8
  const ihdrLen = png.readUInt32BE(offset)
  offset += 12 + ihdrLen
  const parts: Buffer[] = []
  for (const [key, value] of chunks) {
    const data = Buffer.concat([Buffer.from(key, 'latin1'), Buffer.from([0]), Buffer.from(value, 'latin1')])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const type = Buffer.from('tEXt', 'latin1')
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc32(Buffer.concat([type, data])), 0)
    parts.push(length, type, data, crcBuf)
  }
  return Buffer.concat([png.subarray(0, offset), ...parts, png.subarray(offset)])
}

function readTextChunks(png: Buffer): Record<string, string> {
  const out: Record<string, string> = {}
  let offset = 8
  while (offset + 8 <= png.length) {
    const len = png.readUInt32BE(offset)
    const type = png.toString('latin1', offset + 4, offset + 8)
    if (type === 'IEND') break
    if (type === 'tEXt') {
      const data = png.subarray(offset + 8, offset + 8 + len)
      const sep = data.indexOf(0)
      if (sep > 0) out[data.toString('latin1', 0, sep)] = data.toString('latin1', sep + 1)
    }
    offset += 12 + len
  }
  return out
}

async function generateThumbnail(imagePath: string, size: number): Promise<string | null> {
  try {
    let bucket = 128
    for (const s of Object.keys(THUMB_DIRS).map(Number)) {
      if (size <= s) { bucket = s; break }
    }
    const uri = url.pathToFileURL(imagePath).href
    const file = path.join(THUMB_BASE, THUMB_DIRS[bucket], createHash('md5').update(uri).digest('hex') + '.png')

    const st = await fsp.lstat(imagePath)
    const cached = await fsp.readFile(file).catch(() => null)
    if (cached) {
      const meta = readTextChunks(cached)
      const mtime = parseInt(meta['Thumb::MTime'] || '', 10)
      const fsize = parseInt(meta['Thumb::Size'] || '', 10)
      if (mtime === Math.floor(st.mtimeMs / 1000) && fsize === st.size) {
        return 'data:image/png;base64,' + cached.toString('base64')
      }
    }

    const img = nativeImage.createFromPath(imagePath)
    if (img.isEmpty()) return null
    const { width, height } = img.getSize()
    const scale = Math.min(1, bucket / Math.max(width, height))
    const resized = img.resize({
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    })
    const png = insertTextChunks(resized.toPNG(), [
      ['Thumb::URI', uri],
      ['Thumb::MTime', String(Math.floor(st.mtimeMs / 1000))],
      ['Thumb::Size', String(st.size)],
      ['Software', 'file-manager'],
    ])
    await fsp.mkdir(path.dirname(file), { recursive: true })
    await fsp.writeFile(file, png)
    return 'data:image/png;base64,' + png.toString('base64')
  } catch (error) {
    return null
  }
}

const thumbQueue: { imagePath: string; size: number; resolve: (uri: string | null) => void }[] = []
let thumbBusy = false

function enqueueThumbnail(imagePath: string, size: number): Promise<string | null> {
  return new Promise((resolve) => {
    thumbQueue.push({ imagePath, size, resolve })
    drainThumbQueue()
  })
}

async function drainThumbQueue() {
  if (thumbBusy) return
  thumbBusy = true
  while (thumbQueue.length) {
    const task = thumbQueue[0]
    thumbQueue.shift()
    task.resolve(await generateThumbnail(task.imagePath, task.size))
    await new Promise((r) => setImmediate(r))
  }
  thumbBusy = false
}

ipcMain.handle('get-thumbnail', (event, imagePath: string, size: number) => enqueueThumbnail(imagePath, size))

ipcMain.handle('list-themes', async () => {
  const names = await fsp.readdir(THEMES_DIR).catch(() => [] as string[])
  return names.filter(name => name.endsWith('.json')).map(name => name.replace(/\.json$/, ''))
})

ipcMain.handle('read-theme', async (event, name: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(String(name || ''))) return null
  return await fsp.readFile(path.join(THEMES_DIR, name + '.json'), 'utf-8').catch(() => null)
})

ipcMain.handle('get-dir-info', async (event, dirPath: string) => {
  try {
    return await getDirInfo(dirPath)
  } catch (e) {
    return { size: 0, count: 0 }
  }
})

const cancelledTasks = new Set<string | number>()
const pausedTasks = new Set<string | number>()
ipcMain.on('trash-cancel', (event, taskId: string | number) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-restore-cancel', (event, taskId: string | number) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-delete-cancel', (event, taskId: string | number) => { cancelledTasks.add(taskId) })
ipcMain.on('file-copy-cancel', (event, taskId: string | number) => { cancelledTasks.add(taskId) })
ipcMain.on('move-cancel', (event, taskId: string | number) => { cancelledTasks.add(taskId) })
ipcMain.on('move-undo-cancel', (event, taskId: string | number) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-pause', (event, taskId: string | number) => { pausedTasks.add(taskId) })
ipcMain.on('trash-resume', (event, taskId: string | number) => { pausedTasks.delete(taskId) })
ipcMain.on('trash-restore-pause', (event, taskId: string | number) => { pausedTasks.add(taskId) })
ipcMain.on('trash-restore-resume', (event, taskId: string | number) => { pausedTasks.delete(taskId) })
ipcMain.on('trash-delete-pause', (event, taskId: string | number) => { pausedTasks.add(taskId) })
ipcMain.on('trash-delete-resume', (event, taskId: string | number) => { pausedTasks.delete(taskId) })
ipcMain.on('file-copy-pause', (event, taskId: string | number) => { pausedTasks.add(taskId) })
ipcMain.on('file-copy-resume', (event, taskId: string | number) => { pausedTasks.delete(taskId) })

async function waitWhilePausedOrCancelled(taskId?: string | number) {
  while (taskId != null && pausedTasks.has(taskId) && !(taskId && cancelledTasks.has(taskId))) {
    await new Promise((r) => setTimeout(r, 100))
  }
}

ipcMain.handle('move-file', async (event, src: string, dest: string, taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  if (src === dest || await fsp.access(dest).then(() => true).catch(() => false)) {
    dest = await uniqueDest(dest)
  }
  try {
    if (SLOW_FS) throw Object.assign(new Error(), { code: 'EXDEV' })
    await fsp.rename(src, dest)
  } catch (e) {
    if (errCode(e) === 'EXDEV') {
      if (cancelledTasks.has(taskId)) return { cancelled: true }
      const stat = await fsp.stat(src)
      const progressCallback = taskId
        ? (bytes: number) => { event.sender.send('move-progress', { taskId, copiedBytes: bytes }) }
        : () => {}
      try {
        if (stat.isDirectory()) {
          await copyDirWithProgress(src, dest, progressCallback, taskId)
        } else {
          await copyWithProgress(src, dest, progressCallback, taskId)
        }
        if (cancelledTasks.has(taskId)) {
          try { await fsp.rm(dest, { recursive: true }) } catch {}
          return { cancelled: true }
        }
        await fsp.rm(src, { recursive: true })
      } catch (e) {
        if (errMessage(e) === 'cancelled') {
          try { await fsp.rm(dest, { recursive: true }) } catch {}
          return { cancelled: true }
        }
        throw e
      }
    } else {
      throw e
    }
  }
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  return { success: true }
})

ipcMain.handle('trash-items', async (event, paths: string[], taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const total = paths.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes: number[] = []
  for (const p of paths) {
    try {
      const stat = await fsp.stat(p)
      let size
      if (stat.isDirectory()) {
        size = await getDirSize(p)
      } else {
        size = stat.size
      }
      fileSizes.push(size)
      totalBytes += size
    } catch (e) {
      fileSizes.push(0)
    }
  }

  let copiedBytes = 0
  const trashed: { trashName: string; originalPath: string }[] = []

  for (let i = 0; i < paths.length; i++) {
    await waitWhilePausedOrCancelled(taskId)
    if (cancelledTasks.has(taskId)) break
    const p = paths[i]
    const currentFile = path.basename(p)
    try {
      const result = await moveToTrash(p, (bytes) => {
        webContents.send('trash-progress', {
          done, total, errors,
          copiedBytes: copiedBytes + bytes,
          totalBytes,
          currentFile
        })
      }, taskId)
      trashed.push({ trashName: result.trashName, originalPath: p })
    } catch (e) {
      errors++
      lastError = errMessage(e)
      console.error('trash-item failed:', p, e)
    }
    copiedBytes += fileSizes[i]
    done++
    webContents.send('trash-progress', { done, total, errors, copiedBytes, totalBytes, currentFile })
  }

  const cancelled = cancelledTasks.has(taskId)
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)

  if (cancelled && trashed.length) {
    webContents.send('trash-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
    for (const item of trashed) {
      try { await restoreFromTrash(item.trashName, item.originalPath) } catch (e) { console.error('trash rollback failed:', e) }
    }
    return { done: 0, total, errors: 0, lastError: '', cancelled: true }
  }

  return { done, total, errors, lastError }
})

async function uniqueDest(dest: string): Promise<string> {
  if (!(await fsp.access(dest).then(() => true).catch(() => false))) return dest
  const dir = path.dirname(dest)
  const ext = path.extname(dest)
  const base = path.basename(dest, ext)
  let i = 2
  while (true) {
    const candidate = path.join(dir, base + ' (' + i + ')' + ext)
    if (!(await fsp.access(candidate).then(() => true).catch(() => false))) return candidate
    i++
  }
}

ipcMain.handle('file-copy', async (event, paths: string[], destDir: string, taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const total = paths.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes: number[] = []
  for (const p of paths) {
    try {
      const stat = await fsp.stat(p)
      let size
      if (stat.isDirectory()) {
        size = await getDirSize(p)
      } else {
        size = stat.size
      }
      fileSizes.push(size)
      totalBytes += size
    } catch (e) {
      fileSizes.push(0)
    }
  }

  let copiedBytes = 0
  const copiedPaths: string[] = []
  let partialDest: string | null = null

  for (let i = 0; i < paths.length; i++) {
    await waitWhilePausedOrCancelled(taskId)
    if (cancelledTasks.has(taskId)) break
    const p = paths[i]
    const name = path.basename(p)
    let dest = path.join(destDir, name)
    try {
      const stat = await fsp.stat(p)
      if (stat.isDirectory()) {
        dest = await uniqueDest(dest)
        partialDest = dest
        await copyDirWithProgress(p, dest, (bytes) => {
          webContents.send('file-copy-progress', {
            done, total, errors,
            copiedBytes: copiedBytes + bytes,
            totalBytes,
            currentFile: name
          })
        }, taskId)
      } else {
        dest = await uniqueDest(dest)
        partialDest = dest
        await copyWithProgress(p, dest, (bytes) => {
          webContents.send('file-copy-progress', {
            done, total, errors,
            copiedBytes: copiedBytes + bytes,
            totalBytes,
            currentFile: name
          })
        }, taskId)
      }
      copiedPaths.push(dest)
      partialDest = null
    } catch (e) {
      if (errMessage(e) === 'cancelled') break
      if (partialDest) {
        try { await fsp.rm(partialDest, { recursive: true }) } catch (e2) { console.error('file-copy partial cleanup failed:', partialDest, e2) }
      }
      errors++
      lastError = errMessage(e)
      console.error('file-copy failed:', p, e)
    }
    copiedBytes += fileSizes[i]
    done++
    webContents.send('file-copy-progress', { done, total, errors, copiedBytes, totalBytes, currentFile: name })
  }

  const cancelled = cancelledTasks.has(taskId)
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)

  if (cancelled) {
    webContents.send('file-copy-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
    if (partialDest) {
      try { await fsp.rm(partialDest, { recursive: true }) } catch (e) { console.error('copy partial rollback failed:', partialDest, e) }
    }
    for (const cp of copiedPaths) {
      try { await fsp.rm(cp, { recursive: true }) } catch (e) { console.error('copy rollback failed:', cp, e) }
    }
    return { done: 0, total, errors: 0, lastError: '', cancelled: true, copiedPaths: [] }
  }

  return { done, total, errors, lastError, copiedPaths }
})

async function restoreFromTrash(trashName: string, originalPath: string, onBytesCopied?: (bytes: number) => void, taskId?: string | number) {
  const trashDir = path.join(os.homedir(), '.local', 'share', 'Trash')
  const trashFiles = path.join(trashDir, 'files')
  const trashInfo = path.join(trashDir, 'info')

  const srcPath = path.join(trashFiles, trashName)
  const infoPath = path.join(trashInfo, trashName + '.trashinfo')

  const destDir = path.dirname(originalPath)
  await fsp.mkdir(destDir, { recursive: true })

  const baseName = path.basename(originalPath)
  let destName = baseName
  let counter = 1
  while (true) {
    try {
      await fsp.access(path.join(destDir, destName))
      const ext = path.extname(baseName)
      const stem = path.basename(baseName, ext)
      destName = `${stem} (${counter})${ext}`
      counter++
    } catch (e) {
      break
    }
  }

  const destPath = path.join(destDir, destName)
  const stat = await fsp.stat(srcPath)

  if (SLOW_FS) {
    if (stat.isDirectory()) {
      await copyDirWithProgress(srcPath, destPath, onBytesCopied || (() => {}), taskId)
    } else {
      await copyWithProgress(srcPath, destPath, onBytesCopied || (() => {}), taskId)
    }
    await fsp.rm(srcPath, { recursive: true })
  } else {
    try {
      await fsp.rename(srcPath, destPath)
    } catch (e) {
      if (errCode(e) === 'EXDEV') {
        if (stat.isDirectory()) {
          await copyDirWithProgress(srcPath, destPath, onBytesCopied || (() => {}), taskId)
        } else {
          await copyWithProgress(srcPath, destPath, onBytesCopied || (() => {}), taskId)
        }
        await fsp.rm(srcPath, { recursive: true })
      } else {
        throw e
      }
    }
  }

  try { await fsp.unlink(infoPath) } catch (e) {}
  return { restoredPath: destPath }
}

ipcMain.handle('trash-restore-items', async (event, items: TrashItem[], taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const total = items.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes: number[] = []
  const trashDir = path.join(os.homedir(), '.local', 'share', 'Trash')
  const trashFiles = path.join(trashDir, 'files')
  for (const item of items) {
    try {
      const srcPath = path.join(trashFiles, item.trashName)
      const stat = await fsp.stat(srcPath)
      let size
      if (stat.isDirectory()) {
        size = await getDirSize(srcPath)
      } else {
        size = stat.size
      }
      fileSizes.push(size)
      totalBytes += size
    } catch (e) {
      fileSizes.push(0)
    }
  }

  let copiedBytes = 0
  const restored: { restoredPath: string }[] = []

  for (let i = 0; i < items.length; i++) {
    await waitWhilePausedOrCancelled(taskId)
    if (cancelledTasks.has(taskId)) break
    const item = items[i]
    const currentFile = path.basename(item.originalPath)
    try {
      const result = await restoreFromTrash(item.trashName, item.originalPath, (bytes) => {
        webContents.send('trash-restore-progress', {
          done, total, errors,
          copiedBytes: copiedBytes + bytes,
          totalBytes,
          currentFile
        })
      }, taskId)
      restored.push({ restoredPath: result.restoredPath })
    } catch (e) {
      errors++
      lastError = errMessage(e)
      console.error('trash-restore failed:', item, e)
    }
    copiedBytes += fileSizes[i]
    done++
    webContents.send('trash-restore-progress', { done, total, errors, copiedBytes, totalBytes, currentFile })
  }

  const cancelled = cancelledTasks.has(taskId)
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)

  if (cancelled && restored.length) {
    webContents.send('trash-restore-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
    for (const item of restored) {
      try { await moveToTrash(item.restoredPath) } catch (e) { console.error('restore rollback failed:', e) }
    }
    return { done: 0, total, errors: 0, lastError: '', cancelled: true }
  }

  return { done, total, errors, lastError }
})

ipcMain.handle('trash-permanent-delete', async (event, paths: string[], taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const trashDir = path.join(os.homedir(), '.local', 'share', 'Trash')
  const trashInfo = path.join(trashDir, 'info')
  const total = paths.length
  let done = 0
  let errors = 0
  let lastError = ''
  for (const p of paths) {
    await waitWhilePausedOrCancelled(taskId)
    if (cancelledTasks.has(taskId)) break
    if (SLOW_FS) await new Promise((r) => setTimeout(r, 1000))
    const currentFile = path.basename(p)
    try {
      await fsp.rm(p, { recursive: true })
      const baseName = path.basename(p)
      try { await fsp.unlink(path.join(trashInfo, baseName + '.trashinfo')) } catch (e) {}
    } catch (e) {
      errors++
      lastError = errMessage(e)
      console.error('trash-permanent-delete failed:', p, e)
    }
    done++
    webContents.send('trash-permanent-delete-progress', { done, total, errors, currentFile })
  }

  const cancelled = cancelledTasks.has(taskId)
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  return { done, total, errors, lastError, cancelled }
})

ipcMain.handle('copy-undo', async (event, copiedPaths: string[], taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const total = copiedPaths.length
  let done = 0
  let errors = 0
  let lastError = ''
  for (const p of copiedPaths) {
    await waitWhilePausedOrCancelled(taskId)
    if (cancelledTasks.has(taskId)) break
    if (SLOW_FS) await new Promise((r) => setTimeout(r, 1000))
    const currentFile = path.basename(p)
    try {
      await fsp.rm(p, { recursive: true })
    } catch (e) {
      errors++
      lastError = errMessage(e)
      console.error('copy-undo failed:', p, e)
    }
    done++
    event.sender.send('trash-restore-progress', { done, total, errors, copiedBytes: 0, totalBytes: 0, currentFile })
  }
  const wasCancelled = cancelledTasks.has(taskId)
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  return { done, total, errors, lastError, cancelled: wasCancelled }
})

ipcMain.handle('move-undo', async (event, items: MoveUndoItem[], taskId: string | number) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const total = items.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes: number[] = []
  for (const item of items) {
    try {
      const stat = await fsp.stat(item.dest)
      let size
      if (stat.isDirectory()) {
        size = await getDirSize(item.dest)
      } else {
        size = stat.size
      }
      fileSizes.push(size)
      totalBytes += size
    } catch (e) {
      fileSizes.push(0)
    }
  }

  let copiedBytes = 0
  for (let i = 0; i < items.length; i++) {
    await waitWhilePausedOrCancelled(taskId)
    if (cancelledTasks.has(taskId)) break
    const item = items[i]
    const currentFile = path.basename(item.dest)
    const progressCallback = taskId
      ? (bytes: number) => {
          event.sender.send('trash-restore-progress', {
            done, total, errors,
            copiedBytes: copiedBytes + bytes,
            totalBytes,
            currentFile
          })
        }
      : () => {}
    try {
      await fsp.mkdir(path.dirname(item.original), { recursive: true })
      if (SLOW_FS) throw Object.assign(new Error(), { code: 'EXDEV' })
      await fsp.rename(item.dest, item.original)
    } catch (e) {
      if (errCode(e) === 'EXDEV') {
        try {
          const stat = await fsp.stat(item.dest)
          if (stat.isDirectory()) {
            await copyDirWithProgress(item.dest, item.original, progressCallback, taskId)
          } else {
            await copyWithProgress(item.dest, item.original, progressCallback, taskId)
          }
          await fsp.rm(item.dest, { recursive: true })
        } catch (e2) {
          if (errMessage(e2) === 'cancelled') {
            try { await fsp.rm(item.original, { recursive: true }) } catch (e3) { console.error('move-undo partial rollback failed:', item.original, e3) }
          }
          errors++
          lastError = errMessage(e2)
          console.error('move-undo copy failed:', item, e2)
        }
      } else {
        errors++
        lastError = errMessage(e)
        console.error('move-undo rename failed:', item, e)
      }
    }
    copiedBytes += fileSizes[i]
    done++
    event.sender.send('trash-restore-progress', { done, total, errors, copiedBytes, totalBytes, currentFile })
  }
  const wasCancelled = cancelledTasks.has(taskId)
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  return { done, total, errors, lastError, cancelled: wasCancelled }
})
