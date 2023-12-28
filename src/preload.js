const { contextBridge, ipcRenderer } = require('electron')
const { readdirSync, lstatSync } = require('fs')
const { join } = require('path')

contextBridge.exposeInMainWorld(
  'electron',
  {
    readdirSync, join,
    ipcRenderer: {
      ...ipcRenderer,
      on: ipcRenderer.on.bind(ipcRenderer),
      once: ipcRenderer.once.bind(ipcRenderer),
      removeListener: ipcRenderer.removeListener.bind(ipcRenderer)
    },
    getUserName: _ => require("os").userInfo().username,
    isDir: pathname => lstatSync(pathname).isDirectory()
  }
)

