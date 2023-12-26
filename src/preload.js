const { contextBridge, ipcRenderer } = require('electron')
const {readdirSync,lstatSync} = require('fs')
const {join} = require('path')

contextBridge.exposeInMainWorld(
  'electron',
  {
    readdirSync, join,
    getUserName: _ => require("os").userInfo().username,
    isDir: pathname => lstatSync(pathname).isDirectory()
  }
)
