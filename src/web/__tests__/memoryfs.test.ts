import { describe, it, expect } from 'vitest'
import {
  MemoryFs,
  buildDemoFs,
  createFile,
  createDir,
  joinPaths,
  splitPath,
  sizeOf,
  utf8Length,
} from '../memoryfs'

describe('path helpers', () => {
  it('joinPaths joins and normalizes segments', () => {
    expect(joinPaths('/home', 'demo')).toBe('/home/demo')
    expect(joinPaths('home', 'demo', '.config/x')).toBe('/home/demo/.config/x')
    expect(joinPaths('/a', '../b')).toBe('/b')
    expect(joinPaths('/')).toBe('/')
  })

  it('splitPath splits and filters empty segments', () => {
    expect(splitPath('/home/demo/')).toEqual(['home', 'demo'])
    expect(splitPath('/')).toEqual([])
    expect(splitPath('a/b/c')).toEqual(['a', 'b', 'c'])
  })
})

describe('utf8Length', () => {
  it('counts UTF-8 bytes', () => {
    expect(utf8Length('abc')).toBe(3)
    expect(utf8Length('é')).toBe(2)
    expect(utf8Length('中')).toBe(3)
    expect(utf8Length('😀')).toBe(4)
  })
})

describe('MemoryFs', () => {
  it('mkdirp creates nested directories', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a/b/c')
    expect(fs.get('/a/b/c')?.isDir).toBe(true)
    expect(fs.get('/a')?.isDir).toBe(true)
  })

  it('mkdir throws when parent is missing', () => {
    const fs = new MemoryFs()
    expect(() => fs.mkdir('/missing/x')).toThrowError(expect.objectContaining({ code: 'ENOENT' }))
  })

  it('writeFile then readFile round trips content', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a')
    fs.writeFile('/a/hello.txt', 'hi')
    expect(fs.get('/a/hello.txt')?.content).toBe('hi')
    expect(fs.get('/a/hello.txt')?.size).toBe(utf8Length('hi'))
  })

  it('writeFile updates an existing file', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a')
    fs.writeFile('/a/hello.txt', 'one')
    fs.writeFile('/a/hello.txt', 'two')
    expect(fs.get('/a/hello.txt')?.content).toBe('two')
  })

  it('rename moves files between directories', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a')
    fs.mkdirp('/b')
    fs.writeFile('/a/hello.txt', 'hi')
    fs.rename('/a/hello.txt', '/b/hello.txt')
    expect(fs.get('/a/hello.txt')).toBeNull()
    expect(fs.get('/b/hello.txt')?.content).toBe('hi')
  })

  it('rm removes files and refuses non-empty dirs without recursive', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a/b')
    fs.writeFile('/a/b/x.txt', 'x')
    expect(() => fs.rm('/a', false)).toThrowError(expect.objectContaining({ code: 'ENOTEMPTY' }))
    fs.rm('/a', true)
    expect(fs.get('/a')).toBeNull()
  })

  it('stat reports isDirectory/isFile', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a')
    fs.writeFile('/a/f.txt', 'x')
    expect(fs.stat('/a')?.isDirectory()).toBe(true)
    expect(fs.stat('/a/f.txt')?.isFile()).toBe(true)
    expect(fs.stat('/nope')).toBeNull()
  })

  it('exists', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a')
    expect(fs.exists('/a')).toBe(true)
    expect(fs.exists('/b')).toBe(false)
  })

  it('createFile and createDir build nodes with modes', () => {
    const file = createFile('f.txt', 'content')
    expect(file.isDir).toBe(false)
    expect(file.size).toBe(utf8Length('content'))
    const dir = createDir('d')
    expect(dir.isDir).toBe(true)
    expect(dir.mode).toBeGreaterThan(0)
  })
})

describe('sizeOf', () => {
  it('sums file sizes under a directory', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a/b')
    fs.writeFile('/a/x.txt', '12345')
    fs.writeFile('/a/b/y.txt', '123')
    const dir = fs.get('/a')
    expect(dir?.isDir).toBe(true)
    expect(sizeOf(dir as NonNullable<typeof dir>)).toBe(8)
  })

  it('returns file size for files', () => {
    const fs = new MemoryFs()
    fs.mkdirp('/a')
    fs.writeFile('/a/f.txt', '12345')
    const file = fs.get('/a/f.txt')
    expect(file?.isDir).toBe(false)
    expect(sizeOf(file as NonNullable<typeof file>)).toBe(5)
  })
})

describe('buildDemoFs', () => {
  it('creates the demo home with expected entries', () => {
    const fs = buildDemoFs('demo')
    expect(fs.get('/home/demo')?.isDir).toBe(true)
    const names = fs.list('/home/demo').map(n => n.name)
    for (const expected of ['Desktop', 'Documents', 'Downloads', 'Pictures', 'hello.js', 'index.html']) {
      expect(names).toContain(expected)
    }
  })

  it('creates the trash directories', () => {
    const fs = buildDemoFs('demo')
    expect(fs.get('/home/demo/.local/share/Trash/files')?.isDir).toBe(true)
    expect(fs.get('/home/demo/.local/share/Trash/info')?.isDir).toBe(true)
  })

  it('embeds a gradient image in landscape.png', () => {
    const fs = buildDemoFs('demo')
    const png = fs.get('/home/demo/Pictures/landscape.png')
    expect(png?.imageBase64).toBeTruthy()
  })

  it('demo files contain searchable content', () => {
    const fs = buildDemoFs('demo')
    expect(fs.get('/home/demo/Documents/example.txt')?.content).toContain('brown')
    expect(fs.get('/home/demo/.config/user-dirs.dirs')?.content).toContain('XDG_DOCUMENTS_DIR')
  })
})
