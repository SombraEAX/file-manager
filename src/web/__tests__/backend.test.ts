import { describe, it, expect } from 'vitest'
import { createWebElectronApi } from '../backend'
import type { ElectronAPI } from '../../types/ipc'

function freshApi(): ElectronAPI {
  return createWebElectronApi() as ElectronAPI
}

describe('web backend api', () => {
  it('exposes the demo user and trash path', () => {
    const api = freshApi()
    expect(api.getUserName()).toBe('demo')
    expect(api.trashPath).toBe('trash://')
    expect(api.join('/home', 'demo', 'hello.js')).toBe('/home/demo/hello.js')
  })

  it('reads the home directory with typed entries', async () => {
    const api = freshApi()
    const entries = await api.readdir('/home/demo')
    const names = entries.map(e => e.name)
    expect(names).toContain('hello.js')
    expect(entries.find(e => e.name === 'Desktop')?.type).toBe('directory')
    expect(entries.find(e => e.name === 'hello.js')?.type).toBe('file')
    expect(entries.find(e => e.name === 'hello.js')?.filetype).toBeDefined()
  })

  it('throws ENOENT for missing directories', async () => {
    const api = freshApi()
    await expect(api.readdir('/home/nope')).rejects.toThrowError(expect.objectContaining({ code: 'ENOENT' }))
  })

  it('creates, writes, reads and renames files', async () => {
    const api = freshApi()
    await api.mkdir('/home/demo/Documents/unit-dir')
    await api.writeFile('/home/demo/Documents/unit-dir/note.txt', 'unit content')
    expect(await api.readFile('/home/demo/Documents/unit-dir/note.txt')).toBe('unit content')
    expect(api.readFileSync('/home/demo/Documents/unit-dir/note.txt', 'utf8')).toBe('unit content')
    await api.rename('/home/demo/Documents/unit-dir/note.txt', '/home/demo/Documents/unit-dir/renamed.txt')
    expect(await api.readFile('/home/demo/Documents/unit-dir/renamed.txt')).toBe('unit content')
  })

  it('moves files to trash and restores them with original paths', async () => {
    const api = freshApi()
    const result = await api.ipcRenderer.invoke('trash-items', ['/home/demo/hello.js'], 't1')
    expect(result.errors).toBe(0)

    const trash = await api.readdir(api.trashPath)
    expect(trash.some(e => e.name === 'hello.js')).toBe(true)

    const allInfo = await api.readAllTrashInfo(api.trashDirs().info)
    expect(allInfo.find(i => i.trashName === 'hello.js')?.originalPath).toBe('/home/demo/hello.js')

    const restore = await api.ipcRenderer.invoke('trash-restore-items', [{ trashName: 'hello.js', originalPath: '/home/demo/hello.js' }], 't2')
    expect(restore.errors).toBe(0)

    const home = await api.readdir('/home/demo')
    expect(home.some(e => e.name === 'hello.js')).toBe(true)
    expect((await api.readdir(api.trashPath)).some(e => e.name === 'hello.js')).toBe(false)
  })

  it('copies and moves files through ipc handlers', async () => {
    const api = freshApi()
    const copy = await api.ipcRenderer.invoke('file-copy', ['/home/demo/hello.js'], '/home/demo/Documents', 'c1')
    expect(copy.errors).toBe(0)
    expect(copy.copiedPaths).toHaveLength(1)
    expect((await api.readdir('/home/demo/Documents')).some(e => e.name === 'hello.js')).toBe(true)

    const move = await api.ipcRenderer.invoke('move-file', '/home/demo/Documents/hello.js', '/home/demo/Documents/moved.js', 'm1')
    expect(move.success).toBe(true)
    const docs = await api.readdir('/home/demo/Documents')
    expect(docs.some(e => e.name === 'moved.js')).toBe(true)
    expect(docs.some(e => e.name === 'hello.js')).toBe(false)
  })

  it('permanently deletes files from the trash', async () => {
    const api = freshApi()
    await api.ipcRenderer.invoke('trash-items', ['/home/demo/index.html'], 'd1')
    const trash = await api.readdir(api.trashPath)
    const entryName = trash.find(e => e.name === 'index.html')?.name
    expect(entryName).toBeDefined()

    const del = await api.ipcRenderer.invoke('trash-permanent-delete', [api.join(api.trashDirs().files, entryName as string)], 'd2')
    expect(del.errors).toBe(0)
    expect((await api.readdir(api.trashPath)).some(e => e.name === 'index.html')).toBe(false)
  })

  it('searches file contents and returns results via postMessage', async () => {
    const api = freshApi()
    const found: string[] = []

    const handler = (ev: MessageEvent): void => {
      const data = ev.data as { type?: string; done?: boolean; batch?: { name: string }[] } | null
      if (data && data.type === '__search_batch' && data.batch) {
        for (const entry of data.batch) found.push(entry.name)
      }
    }
    window.addEventListener('message', handler)

    const id = api.startSearch({
      query: 'brown',
      location: '/home/demo',
      searchIn: 'Filenames and content',
      filetypes: [],
      includeHidden: false,
      useRegex: false,
    })
    expect(typeof id).toBe('string')

    await new Promise(resolve => setTimeout(resolve, 100))
    window.removeEventListener('message', handler)
    expect(found).toContain('example.txt')
    api.cancelSearch(id)
  })

  it('supports the clipboard', async () => {
    const api = freshApi()
    api.clipboard.writeText('clipboard text')
    expect(api.clipboard.readText()).toBe('clipboard text')
    expect(await api.ipcRenderer.invoke('get-from-clipboard')).toBe('clipboard text')
  })

  it('opens files with a stubbed window.open', async () => {
    const api = freshApi()
    const original = window.open
    window.open = (() => ({ fake: true })) as unknown as typeof window.open
    try {
      const res = await api.openFile('/home/demo/hello.js')
      expect(res.error).toBe('')
    } finally {
      window.open = original
    }
  })

  it('opens text files as renderable blobs, not downloads', async () => {
    const api = freshApi()
    let captured: Blob | null = null
    const originalCreate = URL.createObjectURL
    URL.createObjectURL = (blob: Blob) => { captured = blob; return 'blob:mock' }
    const originalOpen = window.open
    window.open = (() => ({ fake: true })) as unknown as typeof window.open
    try {
      const res = await api.openFile('/home/demo/hello.js')
      expect(res.error).toBe('')
      const blob = captured as Blob | null
      expect(blob).not.toBeNull()
      expect(blob ? blob.type : '').toBe('text/javascript')
    } finally {
      URL.createObjectURL = originalCreate
      window.open = originalOpen
    }
  })

  it('opens images as data uris', async () => {
    const api = freshApi()
    let capturedUrl: string | null = null
    const originalOpen = window.open
    window.open = ((url: string | URL) => { capturedUrl = String(url); return { fake: true } as unknown as Window }) as typeof window.open
    try {
      const res = await api.openFile('/home/demo/Pictures/landscape.png')
      expect(res.error).toBe('')
      expect(capturedUrl).toMatch(/^data:image\/png;base64,/)
    } finally {
      window.open = originalOpen
    }
  })

  it('returns image data uris for embedded images', async () => {
    const api = freshApi()
    const uri = await api.getImageDataUri('/home/demo/Pictures/landscape.png')
    expect(uri.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('computes directory info', async () => {
    const api = freshApi()
    const info = await api.getDirInfo('/home/demo')
    expect(info.count).toBeGreaterThan(0)
    expect(info.size).toBeGreaterThan(0)
  })
})
