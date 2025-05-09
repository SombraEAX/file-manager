const { contextBridge, ipcRenderer } = require('electron')
const { readdirSync, lstatSync } = require('fs')
const { join } = require('path')
const {readdir, lstat, readFile, access, constants} = require('fs/promises')
const filetypes = Object.entries(require('../filetypes'))
const path = require('path')

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


async function getImageDataUri(imagePath) {
  try {
    await access(imagePath, constants.F_OK);
    const fileBuffer = await readFile(imagePath);
    const extname = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg'; 

    switch (extname) {
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.bmp':
        mimeType = 'image/bmp';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
    }

    const base64String = fileBuffer.toString('base64');

    const dataUri = `data:${mimeType};base64,${base64String}`;

    return dataUri;
  } catch (error) {
    console.error('Ошибка при чтении файла изображения:', error);
    throw error; 
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
        stats[i].modified = new Date(stats[i].mtimeMs)

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
      send: ipcRenderer.send.bind(ipcRenderer),
      on: ipcRenderer.on.bind(ipcRenderer),
      once: ipcRenderer.once.bind(ipcRenderer),
      removeListener: ipcRenderer.removeListener.bind(ipcRenderer)
    },
    readFile,getImageDataUri,
    getUserName: _ => require("os").userInfo().username,
    isDir: pathname => lstatSync(pathname).isDirectory()
  }
)

