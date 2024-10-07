const { contextBridge, ipcRenderer } = require('electron')
const { readdirSync, lstatSync } = require('fs')
const { join } = require('path')
const {readdir, lstat} = require('fs/promises')
const filetypes = Object.entries(require('../filetypes'))

function type(entry){
  switch(true){
    case entry.isDirectory():       return ['directory','Directory']
    case entry.isFile():            return ['file','File']
    case entry.isBlockDevice():     return ['block-device','Block device']
    case entry.isCharacterDevice(): return ['character-device','Character device']
    case entry.isFIFO():            return ['fifo','FIFO']
    case entry.isSocket():          return ['socket','Socket']
    case entry.isSymbolicLink():    return ['symlink','Symlink']
    default:                        return [null,'Unknown format']
  }
}

contextBridge.exposeInMainWorld(
  'electron',
  {
    async readdir(addr){
      let files = await readdir(addr)
      let stats = await Promise.all(files.map(
        file => lstat(join(addr,file))
      ))
      
      for(let i in files){
        let [typeId, typeLabel] = type(stats[i])

        stats[i].name     = files[i]
        stats[i].type     = typeId
        stats[i].filetype = typeLabel

        if(stats[i].type !== 'file') continue

        if(files[i][0] === '.'){
          stats[i].filetype = 'Dotfile'
        }else if(~files[i].indexOf('.')){
          let ext = stats[i].ext = files[i].split('.').pop().toLowerCase()
          let type = filetypes.find(
            ([type,extensions]) => ~extensions.indexOf(ext)
          )  
          if(type) stats[i].filetype = type[0]     
        }        
      }

      return stats
    },
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

