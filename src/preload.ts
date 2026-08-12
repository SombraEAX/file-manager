import { contextBridge, ipcRenderer, clipboard } from 'electron'
import { readdirSync, readFileSync } from 'fs'
import type { Stats } from 'fs'
import { readdir, lstat, stat, readFile, access, constants, rename as fsRename, mkdir, writeFile } from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { EntryStats, SearchParams, TrashInfoEntry, ElectronAPI } from './types/ipc'

const { join } = path
const filetypes: [string, string[]][] = Object.entries(require('../filetypes'))

const TRASH_PATH = 'trash://'

function trashDirs() {
  const base = path.join(os.homedir(), '.local', 'share', 'Trash')
  return { dir: base, files: path.join(base, 'files'), info: path.join(base, 'info') }
}

function type(entry: Stats): [string | null, string] {
  switch (true) {
    case entry.isDirectory():       return ['directory', 'Directory']
    case entry.isFile():            return ['file', 'File']
    case entry.isBlockDevice():     return ['block-device', 'Block device']
    case entry.isCharacterDevice(): return ['character-device', 'Character device']
    case entry.isFIFO():            return ['fifo', 'FIFO']
    case entry.isSocket():          return ['socket', 'Socket']
    case entry.isSymbolicLink():    return ['symlink', 'Symlink']
    default:                        return [null, 'Unknown format']
  }
}

type TrashEntry = Stats & EntryStats

async function readTrashDir(): Promise<TrashEntry[]> {
  const { files } = trashDirs()
  const names = await readdir(files).catch(() => [] as string[])
  const result = await Promise.all(names.map(async (name): Promise<TrashEntry | null> => {
    const full = path.join(files, name)
    let st: Stats
    try { st = await lstat(full) } catch (e) { return null }
    const [typeId, typeLabel] = type(st)
    const entry = Object.assign(st, {
      name,
      type: typeId,
      filetype: typeLabel,
      modified: new Date(st.mtimeMs),
      path: TRASH_PATH + name
    }) as TrashEntry
    if (entry.type !== 'file' && entry.type !== 'symlink') return entry
    if (name[0] === '.') {
      entry.filetype = 'Dotfile'
      entry.ext = 'dotfile'
    } else if (~name.indexOf('.')) {
      const ext = entry.ext = (name.split('.').pop() ?? '').toLowerCase()
      const ft = filetypes.find(
        ([, extensions]) => ~extensions.indexOf(ext)
      )
      if (ft) entry.filetype = ft[0]
    }
    return entry
  }))
  return result.filter((e): e is TrashEntry => e !== null)
}

async function getImageDataUri(imagePath: string) {
  try {
    await access(imagePath, constants.F_OK)
    const fileBuffer = await readFile(imagePath)
    const extname = path.extname(imagePath).toLowerCase()
    let mimeType = 'image/jpeg'

    switch (extname) {
      case '.png':
        mimeType = 'image/png'
        break
      case '.gif':
        mimeType = 'image/gif'
        break
      case '.bmp':
        mimeType = 'image/bmp'
        break
      case '.webp':
        mimeType = 'image/webp'
        break
      case '.svg':
        mimeType = 'image/svg+xml'
        break
    }

    const base64String = fileBuffer.toString('base64')
    return `data:${mimeType};base64,${base64String}`
  } catch (error) {
    console.error('Ошибка при чтении файла изображения:', error)
    throw error
  }
}

async function runSearch(id: string, params: SearchParams) {
  const { query, location, searchIn, filetypes, includeHidden, useRegex } = params
  const BATCH_SIZE = 50
  let buffer: EntryStats[] = []

  function flush(done?: boolean) {
    if (buffer.length || done) {
      window.postMessage({ type: '__search_batch', id, batch: buffer, done }, '*')
      buffer = []
    }
  }

  function matchText(text: string, q: string, regex: boolean): boolean {
    if (!text) return false
    if (regex) { try { return new RegExp(q, 'i').test(text) } catch (e) { return false } }
    return text.toLowerCase().includes(q.toLowerCase())
  }

  const filetypeCategories: [string, string[]][] = Object.entries(require('../filetypes'))

  function getFiletype(name: string, isDir: boolean): string {
    if (isDir) return 'directory'
    if (name[0] === '.') return 'Dotfile'
    const ext = (name.split('.').pop() ?? '').toLowerCase()
    const found = filetypeCategories.find(([, exts]) => exts.includes(ext))
    return found ? found[0] : 'Other'
  }

  const filetypeFilterMap: Record<string, string> = { 'Documents': 'document', 'Images': 'image', 'Video': 'video', 'Audio': 'audio' }

  async function walk(dir: string): Promise<void> {
    if (cancelledSearches.has(id)) return
    let entries: string[]
    try { entries = await readdir(dir) } catch (e) { return }

    for (const name of entries) {
      const fullPath = join(dir, name)
      let stats: Stats
      try { stats = await lstat(fullPath) } catch (e) { continue }

      if (!includeHidden && name.startsWith('.')) continue

      const isDir = stats.isDirectory()
      const entryFiletype = getFiletype(name, isDir)

      if (filetypes.length > 0) {
        const match = filetypes.some(ft => {
          if (ft === 'Code') return !isDir && entryFiletype === 'Other'
          return filetypeFilterMap[ft] === entryFiletype
        })
        if (!match) continue
      }

      let nameMatch = false, contentMatch = false

      if (searchIn === 'Filenames' || searchIn === 'Filenames and content')
        nameMatch = matchText(name, query, useRegex)

      if ((searchIn === 'Content' || searchIn === 'Filenames and content') && !isDir) {
        try {
          const content = await readFile(fullPath, { encoding: 'utf-8' })
          contentMatch = matchText(content, query, useRegex)
        } catch (e) {}
      }

      const matched = searchIn === 'Filenames' ? nameMatch
        : searchIn === 'Content' ? contentMatch
        : (nameMatch || contentMatch)

      if (matched) {
        buffer.push({
          name,
          path: fullPath,
          type: isDir ? 'directory' : 'file',
          filetype: entryFiletype,
          size: stats.size,
          modified: new Date(stats.mtimeMs),
          mtimeMs: stats.mtimeMs,
          ext: isDir ? '' : (name.split('.').pop() ?? '').toLowerCase()
        })
        if (buffer.length >= BATCH_SIZE) flush()
      }

      if (isDir) await walk(fullPath)
    }
  }

  await walk(location)
  flush(true)
}

const cancelledSearches = new Set<string>()

const api: ElectronAPI = {
  async readdir(addr) {
    if (addr === TRASH_PATH) return readTrashDir()
    const files = await readdir(addr)
    const stats = (await Promise.all(
      files.map(file => lstat(join(addr, file)))
    )) as TrashEntry[]

    for (const i in files) {
      const [typeId, typeLabel] = type(stats[i])

      stats[i].name = files[i]
      stats[i].type = typeId
      stats[i].filetype = typeLabel
      stats[i].modified = new Date(stats[i].mtimeMs)

      if (stats[i].type !== 'file' && stats[i].type !== 'symlink') continue

      if (stats[i].type === 'symlink') {
        try {
          const targetStat = await stat(join(addr, files[i]))
          if (targetStat.isDirectory()) {
            stats[i].type = 'directory'
            stats[i].filetype = 'Directory'
            continue
          }
          stats[i].mode = targetStat.mode
        } catch (e) {}
      }

      if (files[i][0] === '.') {
        stats[i].filetype = 'Dotfile'
        stats[i].ext = 'dotfile'
      } else if (~files[i].indexOf('.')) {
        const ext = stats[i].ext = (files[i].split('.').pop() ?? '').toLowerCase()
        const type = filetypes.find(
          ([, extensions]) => ~extensions.indexOf(ext)
        )
        if (type) stats[i].filetype = type[0]
      }

      if (!stats[i].ext && (stats[i].mode & 0o111)) {
        stats[i].ext = 'exe'
      }
    }

    return stats
  },
  clipboard: {
    writeText(str: string) {
      clipboard.writeText(str)
    },
    readText(): string {
      return clipboard.readText()
    }
  },
  readdirSync,
  readFileSync,
  join,
  startSearch(params) {
    const id = Date.now() + '_' + Math.random()
    cancelledSearches.delete(id)
    runSearch(id, params)
    return id
  },
  cancelSearch(id) {
    cancelledSearches.add(id)
  },
  ipcRenderer: {
    ...ipcRenderer,
    send: ipcRenderer.send.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer),
    once: ipcRenderer.once.bind(ipcRenderer),
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
    removeAllListeners: ipcRenderer.removeAllListeners.bind(ipcRenderer)
  },
  readFile: async (pathname: string, encoding?: string) => {
    const content = await readFile(pathname, encoding ? { encoding: encoding as BufferEncoding } : undefined)
    return String(content)
  },
  getImageDataUri,
  getThumbnail: (pathname: string, size: number) => ipcRenderer.invoke('get-thumbnail', pathname, size),
  openExternal(url: string) {
    ipcRenderer.send('open-external', url)
  },
  trashPath: TRASH_PATH,
  trashDirs,
  openFile: async pathname => ipcRenderer.invoke('open-file', pathname),
  getDirInfo: async pathname => ipcRenderer.invoke('get-dir-info', pathname),
  getUserName(): string {
    return os.userInfo().username
  },
  isDir: async pathname => pathname === TRASH_PATH || (await lstat(pathname)).isDirectory(),
  stat: async pathname => lstat(pathname),
  rename: async (oldPath, newPath) => { await fsRename(oldPath, newPath) },
  mkdir: async pathname => { await mkdir(pathname) },
  writeFile: async (pathname, content) => { await writeFile(pathname, content) },
  readTrashInfo: async (infoDir) => {
    const entries = await readdir(infoDir).catch(() => [] as string[])
    const files = entries.filter(name => name.endsWith('.trashinfo'))
    const results = await Promise.all(files.map(async name => {
      try {
        const content = await readFile(path.join(infoDir, name), 'utf-8')
        const match = content.match(/Path=(.+)/)
        if (match) {
          const originalName = path.basename(match[1])
          const trashName = name.replace(/\.trashinfo$/, '')
          return [originalName, trashName] as const
        }
      } catch (e) {}
      return null
    }))
    const map: Record<string, string> = {}
    for (const pair of results) {
      if (pair) map[pair[0]] = pair[1]
    }
    return map
  },
  readAllTrashInfo: async (infoDir) => {
    const entries = await readdir(infoDir).catch(() => [] as string[])
    const files = entries.filter(name => name.endsWith('.trashinfo'))
    const results = await Promise.all(files.map(async name => {
      try {
        const content = await readFile(path.join(infoDir, name), 'utf-8')
        const match = content.match(/Path=(.+)/)
        if (match) {
          return {
            trashName: name.replace(/\.trashinfo$/, ''),
            originalPath: match[1]
          } satisfies TrashInfoEntry
        }
      } catch (e) {}
      return null
    }))
    return results.filter((e): e is TrashInfoEntry => e !== null)
  }
}

contextBridge.exposeInMainWorld('electron', api)
