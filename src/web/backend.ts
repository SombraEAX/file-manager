import type { Stats } from 'fs'
import filetypesJson from '../../filetypes.json'
import type { ElectronAPI, EntryStats, SearchParams, TrashInfoEntry } from '../types/ipc'
import { buildDemoFs, joinPaths, sizeOf } from './memoryfs'
import type { MemNode } from './memoryfs'
import { WebIpc } from './ipc'

const TRASH_PATH = 'trash://'
const USER_NAME = 'demo'
const HOME_DIR = '/home/' + USER_NAME
const ITEM_DELAY = 260

const filetypes = Object.entries(filetypesJson) as [string, string[]][]

function nodeType(node: MemNode): [string | null, string] {
  if (node.isDir) return ['directory', 'Directory']
  return ['file', 'File']
}

function baseName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

function dirName(path: string): string {
  const index = path.lastIndexOf('/')
  return index <= 0 ? '/' : path.slice(0, index)
}

function extName(path: string): string {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot) : ''
}

function stemName(path: string): string {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function dateStr(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function mimeFor(path: string): string {
  const ext = extName(path).toLowerCase()
  switch (ext) {
    case '.png': return 'image/png'
    case '.gif': return 'image/gif'
    case '.bmp': return 'image/bmp'
    case '.webp': return 'image/webp'
    case '.svg': return 'image/svg+xml'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.html':
    case '.htm': return 'text/html'
    case '.css': return 'text/css'
    case '.js':
    case '.mjs':
    case '.ts':
    case '.tsx':
    case '.vue': return 'text/javascript'
    case '.json': return 'application/json'
    case '.xml': return 'application/xml'
    default: return 'text/plain'
  }
}

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const cancelledTasks = new Set<string | number>()
const pausedTasks = new Set<string | number>()

async function waitWhilePausedOrCancelled(taskId?: string | number) {
  while (taskId != null && pausedTasks.has(taskId) && !cancelledTasks.has(taskId)) {
    await delay(80)
  }
}

async function checkCancelled(taskId?: string | number) {
  if (taskId != null && cancelledTasks.has(taskId)) throw new Error('cancelled')
}

export function createWebElectronApi(): ElectronAPI {
  const fs = buildDemoFs(USER_NAME)

  const ipc = new WebIpc()

  const trashDirs = () => ({
    dir: HOME_DIR + '/.local/share/Trash',
    files: HOME_DIR + '/.local/share/Trash/files',
    info: HOME_DIR + '/.local/share/Trash/info',
  })

  const clipboard = { text: '' }

  ipc.onSend = (channel, args) => {
    const id = args[0] as string | number | undefined
    switch (channel) {
      case 'trash-cancel':
      case 'trash-restore-cancel':
      case 'trash-delete-cancel':
      case 'file-copy-cancel':
      case 'move-cancel':
      case 'move-undo-cancel':
        if (id != null) cancelledTasks.add(id)
        break
      case 'trash-pause':
      case 'trash-restore-pause':
      case 'trash-delete-pause':
      case 'file-copy-pause':
        if (id != null) pausedTasks.add(id)
        break
      case 'trash-resume':
      case 'trash-restore-resume':
      case 'trash-delete-resume':
      case 'file-copy-resume':
        if (id != null) pausedTasks.delete(id)
        break
      case 'copy-to-clipboard':
        clipboard.text = String(args[0] ?? '')
        break
      case 'open-external':
        window.open(String(args[0]), '_blank', 'noopener')
        break
    }
  }

  function buildEntry(node: MemNode, fullPath: string): EntryStats {
    const [type, filetype] = nodeType(node)
    const entry: EntryStats = {
      name: node.name,
      path: fullPath,
      type,
      filetype,
      modified: new Date(node.mtimeMs),
      mode: node.mode,
      mtimeMs: node.mtimeMs,
    }
    if (node.isDir) {
      entry.size = undefined
    } else {
      entry.size = node.size
    }
    if (type !== 'file') return entry
    if (node.name[0] === '.') {
      entry.filetype = 'Dotfile'
      entry.ext = 'dotfile'
    } else if (node.name.includes('.')) {
      const ext = entry.ext = (node.name.split('.').pop() ?? '').toLowerCase()
      const found = filetypes.find(([, extensions]) => extensions.includes(ext))
      if (found) entry.filetype = found[0]
    }
    if (!entry.ext && (node.mode & 0o111)) {
      entry.ext = 'exe'
    }
    return entry
  }

  function readTrashDir(): EntryStats[] {
    const dirs = trashDirs()
    const files = fs.get(dirs.files)
    if (!files || !files.isDir || !files.children) return []
    return Array.from(files.children.values()).map(node => buildEntry(node, TRASH_PATH + node.name))
  }

  function readTrashInfoMap(infoDir: string): Record<string, string> {
    const dir = fs.get(infoDir)
    if (!dir || !dir.isDir || !dir.children) return {}
    const map: Record<string, string> = {}
    for (const node of dir.children.values()) {
      if (!node.isDir && node.name.endsWith('.trashinfo') && node.content) {
        const match = node.content.match(/Path=(.+)/)
        if (match) {
          map[baseName(match[1])] = node.name.replace(/\.trashinfo$/, '')
        }
      }
    }
    return map
  }

  function readAllTrashInfo(infoDir: string): TrashInfoEntry[] {
    const dir = fs.get(infoDir)
    if (!dir || !dir.isDir || !dir.children) return []
    const result: TrashInfoEntry[] = []
    for (const node of dir.children.values()) {
      if (!node.isDir && node.name.endsWith('.trashinfo') && node.content) {
        const match = node.content.match(/Path=(.+)/)
        if (match) {
          result.push({
            trashName: node.name.replace(/\.trashinfo$/, ''),
            originalPath: match[1],
          })
        }
      }
    }
    return result
  }

  async function moveToTrash(realPath: string) {
    const dirs = trashDirs()
    fs.mkdirp(dirs.files)
    fs.mkdirp(dirs.info)
    const node = fs.get(realPath)
    if (!node) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    const baseNameOrig = node.name
    let destName = baseNameOrig
    let counter = 1
    while (fs.exists(joinPaths(dirs.files, destName))) {
      destName = `${stemName(baseNameOrig)} (${counter})${extName(baseNameOrig)}`
      counter++
    }
    fs.rename(realPath, joinPaths(dirs.files, destName))
    const infoContent = `[Trash Info]\nPath=${realPath}\nDeletionDate=${dateStr()}\n`
    fs.writeFile(joinPaths(dirs.info, destName + '.trashinfo'), infoContent)
    return { trashName: destName }
  }

  async function restoreFromTrash(trashName: string, originalPath: string) {
    const dirs = trashDirs()
    const srcPath = joinPaths(dirs.files, trashName)
    const node = fs.get(srcPath)
    if (!node) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    const destDir = dirName(originalPath)
    fs.mkdirp(destDir)
    const base = baseName(originalPath) || trashName
    let destName = base
    let counter = 1
    while (fs.exists(joinPaths(destDir, destName))) {
      destName = `${stemName(base)} (${counter})${extName(base)}`
      counter++
    }
    fs.rename(srcPath, joinPaths(destDir, destName))
    try { fs.rm(joinPaths(dirs.info, trashName + '.trashinfo'), true) } catch { /* ignore */ }
    return { restoredPath: joinPaths(destDir, destName) }
  }

  function uniqueDest(dest: string): string {
    if (!fs.exists(dest)) return dest
    const dir = dirName(dest)
    const ext = extName(dest)
    const base = stemName(dest)
    let i = 2
    while (true) {
      const candidate = joinPaths(dir, base + ' (' + i + ')' + ext)
      if (!fs.exists(candidate)) return candidate
      i++
    }
  }

  function uniqueName(dir: string, base: string, ext: string): string {
    let name = base + ext
    let i = 1
    while (fs.exists(joinPaths(dir, name))) {
      i++
      name = `${base} (${i})${ext}`
    }
    return name
  }

  async function trashItems(paths: string[], taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    const total = paths.length
    let done = 0
    let errors = 0
    let lastError = ''

    const fileSizes: number[] = []
    let totalBytes = 0
    for (const p of paths) {
      const node = fs.get(p)
      if (node) {
        const size = sizeOf(node)
        fileSizes.push(size)
        totalBytes += size
      } else {
        fileSizes.push(0)
      }
    }

    let copiedBytes = 0
    const trashed: { trashName: string; originalPath: string }[] = []

    for (let i = 0; i < paths.length; i++) {
      await waitWhilePausedOrCancelled(taskId)
      if (cancelledTasks.has(taskId)) break
      const p = paths[i]
      const currentFile = baseName(p)
      try {
        await delay(ITEM_DELAY)
        const result = await moveToTrash(p)
        trashed.push({ trashName: result.trashName, originalPath: p })
      } catch (e) {
        errors++
        lastError = (e as Error).message
      }
      copiedBytes += fileSizes[i]
      done++
      ipc.emit('trash-progress', { done, total, errors, copiedBytes, totalBytes, currentFile })
    }

    const cancelled = cancelledTasks.has(taskId)
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)

    if (cancelled && trashed.length) {
      ipc.emit('trash-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
      for (const item of trashed) {
        try { await restoreFromTrash(item.trashName, item.originalPath) } catch { /* ignore */ }
      }
      return { done: 0, total, errors: 0, lastError: '', cancelled: true }
    }

    return { done, total, errors, lastError }
  }

  async function fileCopy(paths: string[], destDir: string, taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    const total = paths.length
    let done = 0
    let errors = 0
    let lastError = ''

    const fileSizes: number[] = []
    let totalBytes = 0
    for (const p of paths) {
      const node = fs.get(p)
      if (node) {
        const size = sizeOf(node)
        fileSizes.push(size)
        totalBytes += size
      } else {
        fileSizes.push(0)
      }
    }

    fs.mkdirp(destDir)
    const destParent = fs.get(destDir)
    if (!destParent || !destParent.isDir || !destParent.children) {
      return { done, total, errors: 1, lastError: 'Not a directory' }
    }

    let copiedBytes = 0
    const copiedPaths: string[] = []

    for (let i = 0; i < paths.length; i++) {
      await waitWhilePausedOrCancelled(taskId)
      if (cancelledTasks.has(taskId)) break
      const p = paths[i]
      const name = baseName(p)
      const node = fs.get(p)
      try {
        if (!node) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
        await delay(ITEM_DELAY)
        const destName = uniqueName(destDir, stemName(name), extName(name))
        const copy = cloneInto(node)
        copy.name = destName
        destParent.children.set(destName, copy)
        copiedPaths.push(joinPaths(destDir, destName))
      } catch (e) {
        if ((e as Error).message === 'cancelled') break
        errors++
        lastError = (e as Error).message
      }
      copiedBytes += fileSizes[i]
      done++
      ipc.emit('file-copy-progress', { done, total, errors, copiedBytes, totalBytes, currentFile: name })
    }

    const cancelled = cancelledTasks.has(taskId)
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)

    if (cancelled) {
      ipc.emit('file-copy-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
      for (const cp of copiedPaths) {
        try { fs.rm(cp, true) } catch { /* ignore */ }
      }
      return { done: 0, total, errors: 0, lastError: '', cancelled: true, copiedPaths: [] }
    }

    return { done, total, errors, lastError, copiedPaths }
  }

  async function trashRestoreItems(items: { trashName: string; originalPath: string }[], taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    const total = items.length
    let done = 0
    let errors = 0
    let lastError = ''

    const fileSizes: number[] = []
    let totalBytes = 0
    const dirs = trashDirs()
    for (const item of items) {
      const node = fs.get(joinPaths(dirs.files, item.trashName))
      if (node) {
        const size = sizeOf(node)
        fileSizes.push(size)
        totalBytes += size
      } else {
        fileSizes.push(0)
      }
    }

    let copiedBytes = 0
    const restored: { restoredPath: string }[] = []

    for (let i = 0; i < items.length; i++) {
      await waitWhilePausedOrCancelled(taskId)
      if (cancelledTasks.has(taskId)) break
      const item = items[i]
      const currentFile = baseName(item.originalPath)
      try {
        await delay(ITEM_DELAY)
        const result = await restoreFromTrash(item.trashName, item.originalPath)
        restored.push({ restoredPath: result.restoredPath })
      } catch (e) {
        errors++
        lastError = (e as Error).message
      }
      copiedBytes += fileSizes[i]
      done++
      ipc.emit('trash-restore-progress', { done, total, errors, copiedBytes, totalBytes, currentFile })
    }

    const cancelled = cancelledTasks.has(taskId)
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)

    if (cancelled && restored.length) {
      ipc.emit('trash-restore-progress', { done, total, errors: 0, copiedBytes: totalBytes, totalBytes, currentFile: 'Cancelling…', cancelled: true })
      for (const item of restored) {
        try { await moveToTrash(item.restoredPath) } catch { /* ignore */ }
      }
      return { done: 0, total, errors: 0, lastError: '', cancelled: true }
    }

    return { done, total, errors, lastError }
  }

  async function trashPermanentDelete(paths: string[], taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    const dirs = trashDirs()
    const total = paths.length
    let done = 0
    let errors = 0
    let lastError = ''
    for (const p of paths) {
      await waitWhilePausedOrCancelled(taskId)
      if (cancelledTasks.has(taskId)) break
      const currentFile = baseName(p)
      try {
        await delay(ITEM_DELAY)
        fs.rm(p, true)
        try { fs.rm(joinPaths(dirs.info, currentFile + '.trashinfo'), true) } catch { /* ignore */ }
      } catch (e) {
        errors++
        lastError = (e as Error).message
      }
      done++
      ipc.emit('trash-permanent-delete-progress', { done, total, errors, currentFile })
    }
    const cancelled = cancelledTasks.has(taskId)
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    return { done, total, errors, lastError, cancelled }
  }

  async function copyUndo(copiedPaths: string[], taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    const total = copiedPaths.length
    let done = 0
    let errors = 0
    let lastError = ''
    for (const p of copiedPaths) {
      await waitWhilePausedOrCancelled(taskId)
      if (cancelledTasks.has(taskId)) break
      const currentFile = baseName(p)
      try {
        await delay(ITEM_DELAY)
        fs.rm(p, true)
      } catch (e) {
        errors++
        lastError = (e as Error).message
      }
      done++
      ipc.emit('trash-restore-progress', { done, total, errors, copiedBytes: 0, totalBytes: 0, currentFile })
    }
    const wasCancelled = cancelledTasks.has(taskId)
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    return { done, total, errors, lastError, cancelled: wasCancelled }
  }

  async function moveUndo(items: { dest: string; original: string }[], taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    const total = items.length
    let done = 0
    let errors = 0
    let lastError = ''
    for (const item of items) {
      await waitWhilePausedOrCancelled(taskId)
      if (cancelledTasks.has(taskId)) break
      const currentFile = baseName(item.dest)
      try {
        await delay(ITEM_DELAY)
        fs.mkdirp(dirName(item.original))
        fs.rename(item.dest, item.original)
      } catch (e) {
        errors++
        lastError = (e as Error).message
      }
      done++
      ipc.emit('trash-restore-progress', { done, total, errors, copiedBytes: 0, totalBytes: 0, currentFile })
    }
    const wasCancelled = cancelledTasks.has(taskId)
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    return { done, total, errors, lastError, cancelled: wasCancelled }
  }

  async function moveFile(src: string, dest: string, taskId: string | number) {
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    if (src === dest || fs.exists(dest)) {
      dest = uniqueDest(dest)
    }
    try {
      const node = fs.get(src)
      if (!node) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
      await delay(ITEM_DELAY)
      const bytes = sizeOf(node)
      ipc.emit('move-progress', { taskId, copiedBytes: bytes })
      await checkCancelled(taskId)
      fs.rename(src, dest)
    } catch (e) {
      if ((e as Error).message === 'cancelled') {
        try { fs.rm(dest, true) } catch { /* ignore */ }
        return { cancelled: true }
      }
      throw e
    }
    cancelledTasks.delete(taskId)
    pausedTasks.delete(taskId)
    return { success: true }
  }

  function getDirInfo(dirPath: string): { size: number; count: number } {
    const node = fs.get(dirPath)
    if (!node || !node.isDir) return { size: 0, count: 0 }
    const count = (n: MemNode): number => {
      if (!n.isDir || !n.children) return 1
      let c = 0
      for (const child of n.children.values()) c += count(child)
      return c
    }
    return { size: sizeOf(node), count: count(node) }
  }

  function openFile(pathname: string): { error: string } {
    const node = fs.get(pathname)
    if (!node || node.isDir) return { error: 'No such file or directory' }
    try {
      let url: string
      if (node.imageBase64) {
        url = 'data:image/png;base64,' + node.imageBase64
      } else {
        const blob = new Blob([node.content || ''], { type: mimeFor(pathname) })
        url = URL.createObjectURL(blob)
      }
      const win = window.open(url, '_blank')
      if (!win) throw new Error('Popup was blocked')
      return { error: '' }
    } catch (e) {
      return { error: (e as Error).message || String(e) }
    }
  }

  const cancelledSearches = new Set<string>()

  function runSearch(id: string, params: SearchParams) {
    const { query, location, searchIn, filetypes: selectedTypes, includeHidden, useRegex } = params
    const BATCH_SIZE = 50
    let buffer: EntryStats[] = []

    function flush(done?: boolean) {
      if (buffer.length || done) {
        window.postMessage({ type: '__search_batch', id, batch: buffer, done }, '*')
        buffer = []
      }
    }

    const matchText = (text: string, q: string, regex: boolean) => {
      if (!text) return false
      if (regex) {
        try { return new RegExp(q, 'i').test(text) } catch { return false }
      }
      return text.toLowerCase().includes(q.toLowerCase())
    }

    const filetypeFilterMap: Record<string, string> = {
      Documents: 'document',
      Images: 'image',
      Video: 'video',
      Audio: 'audio',
    }

    async function walk(dirPath: string): Promise<void> {
      if (cancelledSearches.has(id)) return
      const dir = fs.get(dirPath)
      if (!dir || !dir.isDir || !dir.children) return
      for (const node of dir.children.values()) {
        if (cancelledSearches.has(id)) return
        const fullPath = joinPaths(dirPath, node.name)
        if (!includeHidden && node.name.startsWith('.')) continue
        const isDir = node.isDir
        const entryFiletype = node.isDir ? 'directory' : node.name.startsWith('.') ? 'Dotfile' : (filetypes.find(([, exts]) => exts.includes((node.name.split('.').pop() ?? '').toLowerCase()))?.[0] ?? 'Other')

        if (selectedTypes.length > 0) {
          const match = selectedTypes.some(ft => {
            if (ft === 'Code') return !isDir && entryFiletype === 'Other'
            return filetypeFilterMap[ft] === entryFiletype
          })
          if (!match) continue
        }

        let nameMatch = false
        let contentMatch = false

        if (searchIn === 'Filenames' || searchIn === 'Filenames and content') {
          nameMatch = matchText(node.name, query, useRegex)
        }
        if ((searchIn === 'Content' || searchIn === 'Filenames and content') && !isDir && node.content != null) {
          contentMatch = matchText(node.content, query, useRegex)
        }

        const matched = searchIn === 'Filenames' ? nameMatch
          : searchIn === 'Content' ? contentMatch
          : (nameMatch || contentMatch)

        if (matched) {
          buffer.push({
            name: node.name,
            path: fullPath,
            type: isDir ? 'directory' : 'file',
            filetype: entryFiletype,
            size: node.size,
            modified: new Date(node.mtimeMs),
            mtimeMs: node.mtimeMs,
            ext: isDir ? '' : (node.name.split('.').pop() ?? '').toLowerCase(),
          })
          if (buffer.length >= BATCH_SIZE) {
            flush()
            await delay(0)
          }
        }

        if (isDir) await walk(fullPath)
      }
    }

    void walk(location).then(() => flush(true))
  }

  const api: Omit<ElectronAPI, 'readdirSync' | 'readFileSync'> & {
    readdirSync: (path: string) => string[]
    readFileSync: (path: string, encoding?: unknown) => string | Uint8Array
  } = {
    async readdir(addr) {
      if (addr === TRASH_PATH) return readTrashDir()
      const dir = fs.get(addr)
      if (!dir || !dir.isDir) {
        throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      }
      return fs.list(addr).map(node => buildEntry(node, joinPaths(addr, node.name)))
    },
    clipboard: {
      writeText: (text: string) => { clipboard.text = text },
      readText: () => clipboard.text,
    },
    readdirSync: (path: string) => fs.list(path).map(node => node.name),
    readFileSync: (path: string, encoding?: unknown) => {
      const node = fs.get(path)
      if (!node || node.isDir) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      if (node.imageBase64) return textToBase64(node.imageBase64)
      const enc = typeof encoding === 'string' ? encoding : (encoding as { encoding?: string } | undefined)?.encoding
      if (enc && enc.toLowerCase() !== 'buffer') return node.content || ''
      return new TextEncoder().encode(node.content || '')
    },
    join: joinPaths,
    startSearch(params) {
      const id = Date.now() + '_' + Math.random()
      cancelledSearches.delete(id)
      runSearch(id, params)
      return id
    },
    cancelSearch(id) {
      cancelledSearches.add(id)
    },
    ipcRenderer: ipc as unknown as ElectronAPI['ipcRenderer'],
    async readFile(pathname: string, encoding?: string) {
      const node = fs.get(pathname)
      if (!node || node.isDir) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      if (encoding && encoding.toLowerCase() !== 'buffer') return node.content || ''
      if (node.imageBase64) return textToBase64(node.imageBase64)
      return node.content || ''
    },
    async getImageDataUri(imagePath: string) {
      const node = fs.get(imagePath)
      if (!node || node.isDir) throw new Error('Image not found')
      const mime = mimeFor(imagePath)
      if (node.imageBase64) return 'data:' + mime + ';base64,' + node.imageBase64
      if (node.content != null) return 'data:' + mime + ';base64,' + textToBase64(node.content)
      throw new Error('Image not found')
    },
    openExternal(url: string) {
      window.open(url, '_blank', 'noopener')
    },
    trashPath: TRASH_PATH,
    trashDirs,
    async openFile(pathname: string) {
      return openFile(pathname)
    },
    async getDirInfo(pathname: string) {
      return getDirInfo(pathname)
    },
    getUserName: () => USER_NAME,
    async isDir(pathname: string) {
      return pathname === TRASH_PATH || fs.get(pathname)?.isDir === true
    },
    async stat(pathname: string) {
      const stats = fs.stat(pathname)
      if (!stats) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return stats as unknown as Stats
    },
    async rename(oldPath: string, newPath: string) {
      fs.rename(oldPath, newPath)
    },
    async mkdir(pathname: string) {
      fs.mkdir(pathname)
    },
    async writeFile(pathname: string, content: string) {
      fs.writeFile(pathname, content)
    },
    async readTrashInfo(infoDir: string) {
      return readTrashInfoMap(infoDir)
    },
    async readAllTrashInfo(infoDir: string) {
      return readAllTrashInfo(infoDir)
    },
  }

  ipc.handle('open-directory-dialog', () => HOME_DIR)
  ipc.handle('get-from-clipboard', () => clipboard.text)
  ipc.handle('open-file', (event, pathname: string) => openFile(pathname))
  ipc.handle('get-dir-info', (event, dirPath: string) => getDirInfo(dirPath))
  ipc.handle('move-file', (event, src: string, dest: string, taskId: string | number) => moveFile(src, dest, taskId))
  ipc.handle('trash-items', (event, paths: string[], taskId: string | number) => trashItems(paths, taskId))
  ipc.handle('file-copy', (event, paths: string[], destDir: string, taskId: string | number) => fileCopy(paths, destDir, taskId))
  ipc.handle('trash-restore-items', (event, items: { trashName: string; originalPath: string }[], taskId: string | number) => trashRestoreItems(items, taskId))
  ipc.handle('trash-permanent-delete', (event, paths: string[], taskId: string | number) => trashPermanentDelete(paths, taskId))
  ipc.handle('copy-undo', (event, copiedPaths: string[], taskId: string | number) => copyUndo(copiedPaths, taskId))
  ipc.handle('move-undo', (event, items: { dest: string; original: string }[], taskId: string | number) => moveUndo(items, taskId))

  return api as unknown as ElectronAPI
}

function cloneInto(node: MemNode): MemNode {
  const copy: MemNode = {
    name: node.name,
    isDir: node.isDir,
    mode: node.mode,
    birthtimeMs: node.birthtimeMs,
    mtimeMs: node.mtimeMs,
    size: node.size,
  }
  if (node.isDir) {
    copy.children = new Map()
    if (node.children) {
      for (const child of node.children.values()) {
        copy.children.set(child.name, cloneInto(child))
      }
    }
  } else {
    copy.content = node.content
    copy.imageBase64 = node.imageBase64
  }
  return copy
}

export { HOME_DIR, USER_NAME }
