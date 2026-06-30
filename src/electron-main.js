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
