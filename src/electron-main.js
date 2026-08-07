const { app, BrowserWindow, ipcMain, Menu, MenuItem, clipboard, dialog, shell } = require('electron')
const { spawn } = require('child_process')

const url = require("url")
const path = require("path")
const os = require("os")
const fs = require("fs")
const fsp = require("fs/promises")

const isDev = process.env.NODE_ENV === 'development'
const SLOW_FS = process.env.SLOW_FS === '1'

console.log('[fs-sim] SLOW_FS throttling =', SLOW_FS, "(enable with SLOW_FS=1)")

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Sombra Manager',
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
  let urlAddress = isDev ? 'http://localhost:8081/' : localPath
  mainWindow.loadURL(urlAddress)

  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null
  })

}

app.on('ready', () => {
  Menu.setApplicationMenu(null)
  createWindow()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

ipcMain.on('show-menu-bar-submenu', (event, {items,x,y}) => {
  function buildMenu(items){
    let menu = new Menu()
    items.forEach((item) => {
      if(item.visible == false) return
      if(item.submenu){
        menu.append(new MenuItem({ label: item.label, submenu: buildMenu(item.submenu) }))
      }else{
        let opts = {}
        if(item.role){
          opts.role = item.role
        }else{
          opts.type = item.type || 'normal'
          opts.label = item.label
          if(item.checked !== undefined) opts.checked = item.checked
          if(item.enabled !== undefined) opts.enabled = item.enabled
        }
        if(item.id) opts.click = () => event.reply('show-menu-bar-submenu-reply', item.id)
        let menuItem
        try{
	        menuItem = new MenuItem(opts)
	    }catch(e){
	    	console.log('create menu item error:',e)
	    	throw e
	    }
	    try{
	        menu.append(menuItem)
	    }catch(e){
	    	console.log('menu item append error:',e)
	    	throw e
	    }
      }
    })
    return menu
  }
  let menu = buildMenu(items)
  menu.popup({ window: mainWindow, x:Math.floor(x), y:Math.floor(y) })
})

ipcMain.on('show-menu', (event, {items,x,y}) => {
  let menu = new Menu()

  items.forEach((item, index) => {
    let opts = {}
    if(item.role){
      opts.role = item.role
    }else{
      opts.type = item.type || 'normal'
      opts.label = item.label
      if(item.checked !== undefined) opts.checked = item.checked
    }
    opts.click = () => event.reply('show-menu-reply', index)
    menu.append(new MenuItem(opts))
  })

  menu.popup({ window: mainWindow, x, y })	
})

ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text); 
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url)
});

ipcMain.handle('get-from-clipboard', () => {
  return clipboard.readText(); 
});

ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

function openWithSystemHandler(pathname) {
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
    const settle = (msg) => {
      if (settled) return
      settled = true
      resolve(msg)
    }
    child.on('error', (e) => settle(e.message || String(e)))
    child.on('exit', (code) => {
      settle(code === 0 ? '' : (stderr.trim() || `Failed to open (exit code ${code})`))
    })
    setTimeout(() => settle(''), 3000)
  })
}

ipcMain.handle('open-file', async (event, pathname) => {
  let error = ''
  try {
    error = await openWithSystemHandler(pathname)
  } catch (e) {
    error = e.message || String(e)
  }
  return { error }
});

ipcMain.on('show-history-menu', (event, { history, current, x, y }) => {
  let menu = new Menu()

  history.forEach((pathname, index) =>
    menu.append(new MenuItem({
      checked: index == current,
      type:    'radio',
      label:   pathname,
      click: _ => event.reply('show-history-menu-reply', index)
    }))
  )

  menu.popup({ window: mainWindow, x, y })
})

async function copyWithProgress(src, dest, onBytesCopied, taskId) {
  const rs = fs.createReadStream(src, SLOW_FS ? { highWaterMark: 8 * 1024 * 1024 } : undefined)
  const ws = fs.createWriteStream(dest)
  let totalCopied = 0
  const finished = new Promise((resolve, reject) => {
    ws.on('finish', resolve)
    ws.on('error', reject)
  })
  try {
    for await (const chunk of rs) {
      await waitWhilePausedOrCancelled(taskId)
      if (taskId && cancelledTasks.has(taskId)) throw new Error('cancelled')
      totalCopied += chunk.length
      onBytesCopied(totalCopied)
      if (!ws.write(chunk)) {
        await new Promise((resolve) => ws.once('drain', resolve))
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

async function copyDirWithProgress(src, dest, onBytesCopied, taskId) {
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

async function moveToTrash(filePath, onBytesCopied, taskId) {
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
      if (e.code === 'EXDEV') {
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

async function getDirSize(dirPath) {
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

async function getDirInfo(dirPath) {
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

ipcMain.handle('get-dir-info', async (event, dirPath) => {
  try {
    return await getDirInfo(dirPath)
  } catch (e) {
    return { size: 0, count: 0 }
  }
})

const cancelledTasks = new Set()
const pausedTasks = new Set()
ipcMain.on('trash-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-restore-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-delete-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('file-copy-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('move-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('move-undo-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-pause', (event, taskId) => { pausedTasks.add(taskId) })
ipcMain.on('trash-resume', (event, taskId) => { pausedTasks.delete(taskId) })
ipcMain.on('trash-restore-pause', (event, taskId) => { pausedTasks.add(taskId) })
ipcMain.on('trash-restore-resume', (event, taskId) => { pausedTasks.delete(taskId) })
ipcMain.on('trash-delete-pause', (event, taskId) => { pausedTasks.add(taskId) })
ipcMain.on('trash-delete-resume', (event, taskId) => { pausedTasks.delete(taskId) })
ipcMain.on('file-copy-pause', (event, taskId) => { pausedTasks.add(taskId) })
ipcMain.on('file-copy-resume', (event, taskId) => { pausedTasks.delete(taskId) })

async function waitWhilePausedOrCancelled(taskId) {
  while (taskId != null && pausedTasks.has(taskId) && !(taskId && cancelledTasks.has(taskId))) {
    await new Promise((r) => setTimeout(r, 100))
  }
}

ipcMain.handle('move-file', async (event, src, dest, taskId) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  if (src === dest || await fsp.access(dest).then(() => true).catch(() => false)) {
    dest = await uniqueDest(dest)
  }
  try {
    if (SLOW_FS) throw Object.assign(new Error(), { code: 'EXDEV' })
    await fsp.rename(src, dest)
  } catch (e) {
    if (e.code === 'EXDEV') {
      if (cancelledTasks.has(taskId)) return { cancelled: true }
      const stat = await fsp.stat(src)
      const progressCallback = taskId
        ? (bytes) => { event.sender.send('move-progress', { taskId, copiedBytes: bytes }) }
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
        if (e.message === 'cancelled') {
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

ipcMain.handle('trash-items', async (event, paths, taskId) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const total = paths.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes = []
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
  const trashed = []

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
      lastError = e.message || String(e)
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

function uniqueDest(dest) {
  return new Promise(async (resolve) => {
    if (!(await fsp.access(dest).then(() => true).catch(() => false))) return resolve(dest)
    const dir = path.dirname(dest)
    const ext = path.extname(dest)
    const base = path.basename(dest, ext)
    let i = 2
    while (true) {
      const candidate = path.join(dir, base + ' (' + i + ')' + ext)
      if (!(await fsp.access(candidate).then(() => true).catch(() => false))) return resolve(candidate)
      i++
    }
  })
}

ipcMain.handle('file-copy', async (event, paths, destDir, taskId) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const total = paths.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes = []
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
  const copiedPaths = []
  let partialDest = null

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
      if (e.message === 'cancelled') break
      if (partialDest) {
        try { await fsp.rm(partialDest, { recursive: true }) } catch (e2) { console.error('file-copy partial cleanup failed:', partialDest, e2) }
      }
      errors++
      lastError = e.message || String(e)
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

async function restoreFromTrash(trashName, originalPath, onBytesCopied, taskId) {
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
      if (e.code === 'EXDEV') {
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

ipcMain.handle('trash-restore-items', async (event, items, taskId) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const webContents = event.sender
  const total = items.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes = []
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
  const restored = []

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
      lastError = e.message || String(e)
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

ipcMain.handle('trash-permanent-delete', async (event, paths, taskId) => {
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
      lastError = e.message || String(e)
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

ipcMain.handle('copy-undo', async (event, copiedPaths, taskId) => {
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
      lastError = e.message || String(e)
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

ipcMain.handle('move-undo', async (event, items, taskId) => {
  cancelledTasks.delete(taskId)
  pausedTasks.delete(taskId)
  const total = items.length
  let done = 0
  let errors = 0
  let lastError = ''

  let totalBytes = 0
  const fileSizes = []
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
      ? (bytes) => {
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
      if (e.code === 'EXDEV') {
        try {
          const stat = await fsp.stat(item.dest)
          if (stat.isDirectory()) {
            await copyDirWithProgress(item.dest, item.original, progressCallback, taskId)
          } else {
            await copyWithProgress(item.dest, item.original, progressCallback, taskId)
          }
          await fsp.rm(item.dest, { recursive: true })
        } catch (e2) {
          if (e2.message === 'cancelled') {
            try { await fsp.rm(item.original, { recursive: true }) } catch (e3) { console.error('move-undo partial rollback failed:', item.original, e3) }
          }
          errors++
          lastError = e2.message || String(e2)
          console.error('move-undo copy failed:', item, e2)
        }
      } else {
        errors++
        lastError = e.message || String(e)
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
