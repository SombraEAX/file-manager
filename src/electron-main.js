const { app, BrowserWindow, ipcMain, Menu, MenuItem, clipboard, dialog } = require('electron')

const url = require("url")
const path = require("path")
const os = require("os")
const fs = require("fs")
const fsp = require("fs/promises")

const isDev = process.env.NODE_ENV === 'development'
const SLOW_FS = true

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

ipcMain.handle('get-from-clipboard', () => {
  return clipboard.readText(); 
});

ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
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

async function copyWithProgress(src, dest, onBytesCopied) {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(src)
    const ws = fs.createWriteStream(dest)
    let totalCopied = 0
    rs.on('data', (chunk) => {
      totalCopied += chunk.length
      onBytesCopied(totalCopied)
      if (SLOW_FS) {
        rs.pause()
        setTimeout(() => rs.resume(), 1000)
      }
    })
    rs.on('error', reject)
    ws.on('error', reject)
    ws.on('finish', resolve)
    rs.pipe(ws)
  })
}

async function copyDirWithProgress(src, dest, onBytesCopied) {
  await fsp.mkdir(dest, { recursive: true })
  const entries = await fsp.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirWithProgress(srcPath, destPath, onBytesCopied)
    } else {
      await copyWithProgress(srcPath, destPath, onBytesCopied)
    }
  }
}

async function moveToTrash(filePath, onBytesCopied) {
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
      await copyDirWithProgress(filePath, destPath, onBytesCopied || (() => {}))
    } else {
      await copyWithProgress(filePath, destPath, onBytesCopied || (() => {}))
    }
    await fsp.rm(filePath, { recursive: true })
  } else {
    try {
      await fsp.rename(filePath, destPath)
    } catch (e) {
      if (e.code === 'EXDEV') {
        if (stat.isDirectory()) {
          await copyDirWithProgress(filePath, destPath, onBytesCopied || (() => {}))
        } else {
          await copyWithProgress(filePath, destPath, onBytesCopied || (() => {}))
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

const cancelledTasks = new Set()
ipcMain.on('trash-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-restore-cancel', (event, taskId) => { cancelledTasks.add(taskId) })
ipcMain.on('trash-delete-cancel', (event, taskId) => { cancelledTasks.add(taskId) })

ipcMain.handle('trash-items', async (event, paths, taskId) => {
  cancelledTasks.delete(taskId)
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
      })
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

  if (cancelled && trashed.length) {
    webContents.send('trash-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
    for (const item of trashed) {
      try { await restoreFromTrash(item.trashName, item.originalPath) } catch (e) { console.error('trash rollback failed:', e) }
    }
    return { done: 0, total, errors: 0, lastError: '', cancelled: true }
  }

  return { done, total, errors, lastError }
})

async function restoreFromTrash(trashName, originalPath, onBytesCopied) {
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
      await copyDirWithProgress(srcPath, destPath, onBytesCopied || (() => {}))
    } else {
      await copyWithProgress(srcPath, destPath, onBytesCopied || (() => {}))
    }
    await fsp.rm(srcPath, { recursive: true })
  } else {
    try {
      await fsp.rename(srcPath, destPath)
    } catch (e) {
      if (e.code === 'EXDEV') {
        if (stat.isDirectory()) {
          await copyDirWithProgress(srcPath, destPath, onBytesCopied || (() => {}))
        } else {
          await copyWithProgress(srcPath, destPath, onBytesCopied || (() => {}))
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
      })
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
  const webContents = event.sender
  const trashDir = path.join(os.homedir(), '.local', 'share', 'Trash')
  const trashInfo = path.join(trashDir, 'info')
  const total = paths.length
  let done = 0
  let errors = 0
  let lastError = ''
  for (const p of paths) {
    if (cancelledTasks.has(taskId)) break
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
  return { done, total, errors, lastError, cancelled }
})
