const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron')

const url = require("url")
const path = require("path")

const isDev = process.env.NODE_ENV === 'development'

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

  mainWindow.loadURL(isDev ? 'http://localhost:8080/' : localPath)

  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

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

  menu.popup({x,y})
})
