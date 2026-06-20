const { app, BrowserWindow, ipcMain, Menu, MenuItem, clipboard, dialog } = require('electron')

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
      if(item.visible === false) return
      if(item.submenu){
        menu.append(new MenuItem({ label: item.label, submenu: buildMenu(item.submenu) }))
      }else{
        let opts = { ...item }
        delete opts.id
        delete opts.visible
        opts.click = () => item.id && event.reply('show-menu-bar-submenu-reply', item.id)
        menu.append(new MenuItem(opts))
      }
    })
    return menu
  }
  let menu = buildMenu(items)
  menu.popup({ x, y })
})

ipcMain.on('show-menu', (event, {items,x,y}) => {
  let menu = new Menu()

  items.forEach((item, index) =>
    menu.append(new MenuItem({
      ...item,
      click: _ => event.reply('show-menu-reply', index)
    }))
  )

  menu.popup({x,y})	
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

  menu.popup({x,y})
})
