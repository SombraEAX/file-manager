export interface MemNode {
  name: string
  isDir: boolean
  mode: number
  birthtimeMs: number
  mtimeMs: number
  size: number
  content?: string
  imageBase64?: string
  children?: Map<string, MemNode>
}

const S_IFDIR = 0o040000
const S_IFREG = 0o0100000
const DEFAULT_MODE = 0o755

function childrenOf(node: MemNode): Map<string, MemNode> {
  if (!node.children) {
    node.children = new Map()
  }
  return node.children
}

export function utf8Length(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; i++ }
    else bytes += 3
  }
  return bytes
}

export function splitPath(path: string): string[] {
  return path.split('/').filter(part => part.length > 0 && part !== '.')
}

export function joinPaths(...parts: string[]): string {
  const stack: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part.startsWith('/')) stack.length = 0
    for (const seg of part.split('/')) {
      if (seg === '' || seg === '.') continue
      if (seg === '..') { stack.pop(); continue }
      stack.push(seg)
    }
  }
  return stack.length ? '/' + stack.join('/') : '/'
}

export interface MemStats {
  size: number
  mtimeMs: number
  birthtimeMs: number
  mode: number
  isDirectory(): boolean
  isFile(): boolean
}

function now(): number {
  return Date.now()
}

export function createFile(name: string, content = '', opts?: Partial<Pick<MemNode, 'mode' | 'mtimeMs' | 'birthtimeMs' | 'imageBase64'>>): MemNode {
  const mtime = opts?.mtimeMs ?? now()
  return {
    name,
    isDir: false,
    mode: opts?.mode ?? (S_IFREG | DEFAULT_MODE),
    birthtimeMs: opts?.birthtimeMs ?? mtime,
    mtimeMs: mtime,
    size: opts?.imageBase64 ? utf8Length(opts.imageBase64) : utf8Length(content),
    content,
    imageBase64: opts?.imageBase64,
  }
}

export function createDir(name: string, opts?: Partial<Pick<MemNode, 'mode' | 'mtimeMs' | 'birthtimeMs'>>): MemNode {
  const mtime = opts?.mtimeMs ?? now()
  return {
    name,
    isDir: true,
    mode: opts?.mode ?? (S_IFDIR | DEFAULT_MODE),
    birthtimeMs: opts?.birthtimeMs ?? mtime,
    mtimeMs: mtime,
    size: 4096,
    children: new Map(),
  }
}

export class MemoryFs {
  root: MemNode = createDir('')

  get(path: string): MemNode | null {
    if (!path || path === '/') return this.root
    let node = this.root
    for (const part of splitPath(path)) {
      if (!node.isDir) return null
      const child = childrenOf(node).get(part)
      if (!child) return null
      node = child
    }
    return node
  }

  getParent(path: string): { parent: MemNode; name: string } | null {
    const parts = splitPath(path)
    if (!parts.length) return null
    const name = parts[parts.length - 1]
    const parentPath = parts.length > 1 ? '/' + parts.slice(0, -1).join('/') : '/'
    const parent = this.get(parentPath)
    return parent && parent.isDir ? { parent, name } : null
  }

  list(path: string): MemNode[] {
    const node = this.get(path)
    if (!node || !node.isDir) return []
    return Array.from(childrenOf(node).values())
  }

  mkdir(path: string): void {
    const parent = this.getParent(path)
    if (!parent) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    if (childrenOf(parent.parent).has(parent.name)) {
      throw Object.assign(new Error('File exists'), { code: 'EEXIST' })
    }
    const dir = createDir(parent.name)
    childrenOf(parent.parent).set(parent.name, dir)
  }

  mkdirp(path: string): void {
    let node = this.root
    for (const part of splitPath(path)) {
      let child = childrenOf(node).get(part)
      if (!child) {
        child = createDir(part)
        childrenOf(node).set(part, child)
      }
      if (!child.isDir) {
        throw Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' })
      }
      node = child
    }
  }

  writeFile(path: string, content: string): void {
    const parent = this.getParent(path)
    if (!parent) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    const siblings = childrenOf(parent.parent)
    const existing = siblings.get(parent.name)
    if (existing) {
      existing.content = content
      existing.imageBase64 = undefined
      existing.size = utf8Length(content)
      existing.mtimeMs = now()
      return
    }
    siblings.set(parent.name, createFile(parent.name, content))
  }

  rename(oldPath: string, newPath: string): void {
    const src = this.getParent(oldPath)
    if (!src || !childrenOf(src.parent).has(src.name)) {
      throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    }
    const dest = this.getParent(newPath)
    if (!dest) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    const srcSiblings = childrenOf(src.parent)
    const destSiblings = childrenOf(dest.parent)
    const node = srcSiblings.get(src.name)
    if (!node) throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    if (destSiblings.has(dest.name)) {
      const existing = destSiblings.get(dest.name)
      if (existing && existing.isDir && !node.isDir) {
        throw Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' })
      }
      destSiblings.delete(dest.name)
    }
    node.name = dest.name
    node.mtimeMs = now()
    destSiblings.set(dest.name, node)
    srcSiblings.delete(src.name)
  }

  rm(path: string, recursive: boolean): void {
    const parent = this.getParent(path)
    if (!parent || !childrenOf(parent.parent).has(parent.name)) {
      throw Object.assign(new Error('No such file or directory'), { code: 'ENOENT' })
    }
    const siblings = childrenOf(parent.parent)
    const node = siblings.get(parent.name)
    if (node && node.isDir && childrenOf(node).size > 0 && !recursive) {
      throw Object.assign(new Error('Directory not empty'), { code: 'ENOTEMPTY' })
    }
    siblings.delete(parent.name)
  }

  copyInto(src: MemNode, destParent: MemNode): MemNode {
    const copy = cloneNode(src)
    if (!destParent.isDir) {
      throw Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' })
    }
    childrenOf(destParent).set(src.name, copy)
    return copy
  }

  stat(path: string): MemStats | null {
    const node = this.get(path)
    if (!node) return null
    return {
      size: node.size,
      mtimeMs: node.mtimeMs,
      birthtimeMs: node.birthtimeMs,
      mode: node.mode,
      isDirectory: () => node.isDir,
      isFile: () => !node.isDir,
    }
  }

  exists(path: string): boolean {
    return this.get(path) !== null
  }
}

function cloneNode(node: MemNode): MemNode {
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
    for (const child of childrenOf(node).values()) {
      childrenOf(copy).set(child.name, cloneNode(child))
    }
  } else {
    copy.content = node.content
    copy.imageBase64 = node.imageBase64
  }
  return copy
}

export function sizeOf(node: MemNode): number {
  if (!node.isDir) return node.size
  let total = 0
  for (const child of childrenOf(node).values()) {
    total += sizeOf(child)
  }
  return total
}

function makeGradientPng(): string {
  if (typeof document === 'undefined') {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  }
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const gradient = ctx.createLinearGradient(0, 0, 96, 96)
  gradient.addColorStop(0, '#f94144')
  gradient.addColorStop(0.5, '#f9c74f')
  gradient.addColorStop(1, '#43aa8b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 96, 96)
  return canvas.toDataURL('image/png').split(',')[1]
}

export function buildDemoFs(userName: string): MemoryFs {
  const fs = new MemoryFs()
  const day = 86400000
  const base = Date.now()

  const mkd = (path: string, mtimeOffset = 0) => {
    fs.mkdirp(path)
    const node = fs.get(path)
    if (node) node.mtimeMs = base - mtimeOffset * day
  }

  const mkt = (path: string, content: string, ageDays = 3) => {
    const parentPath = joinPaths(path).slice(0, path.lastIndexOf('/')) || '/'
    fs.mkdirp(parentPath)
    const nameParts = path.split('/').filter(Boolean)
    const file = createFile(nameParts[nameParts.length - 1] || 'file', content, { mtimeMs: base - ageDays * day, birthtimeMs: base - (ageDays + 12) * day })
    const parent = fs.getParent(path)
    if (parent) childrenOf(parent.parent).set(file.name, file)
  }

  const home = `/home/${userName}`

  mkd('/', 0)
  for (const d of ['bin', 'etc', 'root', 'tmp', 'usr', 'var', 'home']) mkd('/' + d, 90)

  mkt('/etc/hosts', '127.0.0.1\tlocalhost\n::1\tlocalhost ip6-localhost\n', 200)
  mkt('/root/README.txt', 'This is the root home directory.\n', 100)

  mkd(home, 30)
  mkd(home + '/Desktop', 25)
  mkd(home + '/Documents', 22)
  mkd(home + '/Downloads', 18)
  mkd(home + '/Music', 15)
  mkd(home + '/Pictures', 12)
  mkd(home + '/Public', 10)
  mkd(home + '/Videos', 8)
  mkd(home + '/.config', 60)
  mkd(home + '/.local/share/Trash/files', 1)
  mkd(home + '/.local/share/Trash/info', 1)
  mkd(home + '/Documents/project', 5)
  mkd(home + '/Documents/project/src', 5)

  mkt(home + '/.config/user-dirs.dirs', [
    'XDG_DESKTOP_DIR="$HOME/Desktop"',
    'XDG_DOWNLOAD_DIR="$HOME/Downloads"',
    'XDG_TEMPLATES_DIR="$HOME/Templates"',
    'XDG_PUBLICSHARE_DIR="$HOME/Public"',
    'XDG_DOCUMENTS_DIR="$HOME/Documents"',
    'XDG_MUSIC_DIR="$HOME/Music"',
    'XDG_PICTURES_DIR="$HOME/Pictures"',
    'XDG_VIDEOS_DIR="$HOME/Videos"',
  ].join('\n') + '\n', 45)

  mkt(home + '/.bashrc', '# ~/.bashrc\n\nexport PS1="\\u@\\h:\\w$ "\nalias ll="ls -lah"\n\necho "Welcome to the file-manager demo!"\n', 40)

  mkt(home + '/.gitignore', 'node_modules/\ndist/\n*.log\n.DS_Store\n', 12)

  mkt(home + '/.hidden-note.txt', 'This file is hidden. Use Ctrl+H (View -> Show hidden files) to see it.\n', 2)

  mkt(home + '/Desktop/readme.txt', 'Welcome to the file-manager web demo!\n\nEverything here lives in your browser memory.\nFeel free to create, rename, copy, move and delete files.\nNothing is saved anywhere.\n', 6)

  mkt(home + '/Documents/notes.md', '# Meeting notes\n\n## 2026-08-07\n\n- Discussed the web demo build\n- All menus are rendered as HTML menus\n- The file system is simulated in memory\n\n## TODO\n\n- [ ] Try the trash restore feature\n- [ ] Test copy with undo\n- [ ] Search in content\n', 4)

  mkt(home + '/Documents/example.txt', 'The quick brown fox jumps over the lazy dog.\n\nThis text file is here so you can try the "Filenames and content" search.\nTry searching for "brown".\n', 3)

  mkt(home + '/Documents/project/README.md', '# demo-project\n\nA tiny sample project for the file-manager web demo.\n\n## Scripts\n\n- `npm run dev` - start the dev server\n- `npm run build` - build for production\n', 5)

  mkt(home + '/Documents/project/package.json', JSON.stringify({
    name: 'demo-project',
    version: '1.0.0',
    private: true,
    scripts: { dev: 'vite', build: 'vite build' },
  }, null, 2) + '\n', 5)

  mkt(home + '/Documents/project/src/index.ts', 'export function greet(name: string): string {\n  return `Hello, ${name}!`\n}\n\nconst message = greet("demo")\nconsole.log(message)\n', 5)

  mkt(home + '/Downloads/sample.txt', 'Open me to test the Open action.\nIn the web demo files are rendered in a new browser tab, not downloaded.\n', 1)

  mkt(home + '/Music/playlist.m3u', '#EXTM3U\n#EXTINF:213,First track\n/usr/share/music/first.mp3\n#EXTINF:180,Second track\n/usr/share/music/second.mp3\n', 20)

  mkt(home + '/Pictures/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">\n  <rect x="8" y="8" width="112" height="112" rx="16" fill="#3498db"/>\n  <path d="M40 88V40h24l24 0 0 16-24 0 0 10h20v16h-20v22z" fill="#fff"/>\n</svg>\n', 9)

  mkt(home + '/Pictures/landscape.png', '', 7)
  const pngNode = fs.get(home + '/Pictures/landscape.png')
  if (pngNode) {
    pngNode.imageBase64 = makeGradientPng()
    pngNode.size = utf8Length(pngNode.imageBase64)
    pngNode.content = undefined
  }

  mkt(home + '/hello.js', 'function greet(name) {\n  return "Hello, " + name + "!"\n}\n\nconsole.log(greet("web demo"))\n', 2)

  mkt(home + '/index.html', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>Sample page</title>\n</head>\n<body>\n  <h1>Hello from the in-memory file system</h1>\n</body>\n</html>\n', 2)

  return fs
}
