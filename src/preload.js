const { contextBridge, ipcRenderer } = require('electron')
const { readdirSync, lstatSync } = require('fs')
const { join } = require('path')
const {readdir, lstat, readFile, access, constants} = require('fs/promises')
const filetypes = Object.entries(require('../filetypes'))
const path = require('path')
const { clipboard } = require('electron')

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

async function runSearch(id, params) {
  const { query, location, searchIn, filetypes, includeHidden, useRegex } = params;
  const BATCH_SIZE = 50;
  let buffer = [];

  function flush(done) {
    if (buffer.length || done) {
      window.postMessage({ type: '__search_batch', id, batch: buffer, done }, '*');
      buffer = [];
    }
  }

  function matchText(text, q, regex) {
    if (!text) return false;
    if (regex) { try { return new RegExp(q, 'i').test(text); } catch(e) { return false; } }
    return text.toLowerCase().includes(q.toLowerCase());
  }

  const filetypeCategories = Object.entries(require('../filetypes'));

  function getFiletype(name, isDir) {
    if (isDir) return 'directory';
    if (name[0] === '.') return 'Dotfile';
    const ext = name.split('.').pop().toLowerCase();
    const found = filetypeCategories.find(([, exts]) => exts.includes(ext));
    return found ? found[0] : 'Other';
  }

  const filetypeFilterMap = { 'Documents': 'document', 'Images': 'image', 'Video': 'video', 'Audio': 'audio' };

  async function walk(dir) {
    if (cancelledSearches.has(id)) return;
    let entries;
    try { entries = await readdir(dir); } catch(e) { return; }

    for (const name of entries) {
      const fullPath = join(dir, name);
      let stats;
      try { stats = await lstat(fullPath); } catch(e) { continue; }

      if (!includeHidden && name.startsWith('.')) continue;

      const isDir = stats.isDirectory();
      const entryFiletype = getFiletype(name, isDir);

      if (filetypes.length > 0) {
        let match = filetypes.some(ft => {
          if (ft === 'Code') return !isDir && entryFiletype === 'Other';
          return filetypeFilterMap[ft] === entryFiletype;
        });
        if (!match) continue;
      }

      let nameMatch = false, contentMatch = false;

      if (searchIn === 'Filenames' || searchIn === 'Filenames and content')
        nameMatch = matchText(name, query, useRegex);

      if ((searchIn === 'Content' || searchIn === 'Filenames and content') && !isDir) {
        try { const content = await readFile(fullPath, { encoding: 'utf-8' }); contentMatch = matchText(content, query, useRegex); } catch(e) {}
      }

      const matched = searchIn === 'Filenames' ? nameMatch
        : searchIn === 'Content' ? contentMatch
        : (nameMatch || contentMatch);

      if (matched) {
        buffer.push({
          name,
          path: fullPath,
          type: isDir ? 'directory' : 'file',
          filetype: entryFiletype,
          size: stats.size,
          modified: new Date(stats.mtimeMs),
          mtimeMs: stats.mtimeMs,
          ext: isDir ? '' : name.split('.').pop().toLowerCase()
        });
        if (buffer.length >= BATCH_SIZE) flush();
      }

      if (isDir) await walk(fullPath);
    }
  }

  await walk(location);
  flush(true);
}

const cancelledSearches = new Set();

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
    clipboard:{
      writeText(str){
        clipboard.writeText(str)
      },
      readText(){
        return clipboard.readText()
      }
    },
    readdirSync, join,
    startSearch(params){
      const id = Date.now() + '_' + Math.random();
      cancelledSearches.delete(id);
      runSearch(id, params);
      return id;
    },
    cancelSearch(id){
      cancelledSearches.add(id);
    },
    ipcRenderer: {
      ...ipcRenderer,
      send: ipcRenderer.send.bind(ipcRenderer),
      on: ipcRenderer.on.bind(ipcRenderer),
      once: ipcRenderer.once.bind(ipcRenderer),
      invoke: ipcRenderer.invoke.bind(ipcRenderer),
      removeListener: ipcRenderer.removeListener.bind(ipcRenderer)
    },
    readFile,getImageDataUri,
    getUserName: _ => require("os").userInfo().username,
    isDir: pathname => lstatSync(pathname).isDirectory()
  }
)

