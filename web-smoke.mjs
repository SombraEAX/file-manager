import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, 'dist')

const browser = await chromium.launch()
const page = await browser.newPage()

const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })

await page.goto('file://' + path.join(DIST, 'index.html'))

await page.waitForSelector('.menu-bar .menu-item', { timeout: 15000 })
console.log('OK menu bar rendered')

const bodyText = await page.textContent('body')
for (const name of ['Desktop', 'Documents', 'Downloads', 'Pictures']) {
  if (!bodyText.includes(name)) throw new Error('Missing entry in home dir: ' + name)
}
console.log('OK home dir entries rendered')

for (const label of ['File', 'Edit', 'View', 'Help']) {
  if (!bodyText.includes(label)) throw new Error('Missing top menu: ' + label)
}
console.log('OK top menus present')

await page.click('.menu-bar .menu-item >> text=File')
await page.waitForSelector('.menu-popup .menu-item', { timeout: 5000 })
const popupText = await page.textContent('.menu-popup')
for (const label of ['New file', 'New folder']) {
  if (!popupText.includes(label)) throw new Error('Missing popup item: ' + label)
}
console.log('OK HTML menu popup works')

await page.keyboard.press('Escape')
await page.waitForTimeout(300)

await page.click('.menu-bar .menu-item >> text=File')
await page.click('.menu-popup .menu-item >> text=New folder')
const renameInput = page.locator('.rename-input').first()
await renameInput.waitFor({ timeout: 5000 })
if (await renameInput.inputValue() !== 'New folder') throw new Error('New folder rename input has wrong value')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
console.log('OK new folder created via menu')

await page.click('.menu-bar .menu-item >> text=View')
await page.waitForSelector('.menu-popup', { timeout: 5000 })
const viewText = await page.textContent('.menu-popup')
if (viewText.includes('HTML menus')) throw new Error('HTML menus toggle should be hidden in web mode')
if (!viewText.includes('Show hidden files')) throw new Error('View menu missing items')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
console.log('OK HTML menus toggle hidden in View menu')

await page.click('.menu-bar .menu-item >> text=View')
await page.waitForSelector('.menu-popup .menu-item >> text=Theme', { timeout: 5000 })
await page.hover('.menu-popup .menu-item >> text=Theme')
await page.waitForSelector('.menu-popup .menu-popup .menu-item >> text=Dark', { timeout: 5000 })
const themeText = await page.textContent('.menu-popup .menu-popup')
if (!themeText.includes('Light') || !themeText.includes('Dark')) {
  throw new Error('Theme submenu missing built-in themes')
}
await page.click('.menu-popup .menu-popup .menu-item >> text=Dark')
await page.waitForTimeout(300)
const activeTheme = await page.evaluate(() => localStorage.getItem('theme'))
if (activeTheme !== 'dark') throw new Error('Dark theme not persisted, got: ' + activeTheme)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
console.log('OK theme switched to dark via View menu')

const helloRow = page.locator('div.main[data-variant]').filter({ hasText: 'hello.js' }).first()
await helloRow.waitFor({ timeout: 5000 })
await helloRow.click({ button: 'right' })
await page.waitForSelector('.menu-popup .menu-item', { timeout: 5000 })
const ctxText = await page.textContent('.menu-popup')
if (!ctxText.includes('Move to Trash')) {
  console.log('CONTEXT POPUP TEXT:', JSON.stringify(ctxText))
  throw new Error('Context menu missing Move to Trash')
}
await page.click('.menu-popup .menu-item >> text=Move to Trash')
await page.waitForSelector('.trash-confirm-overlay .trash-confirm-btn.confirm', { timeout: 5000 })
await page.click('.trash-confirm-overlay .trash-confirm-btn.confirm')
await page.waitForTimeout(1200)
const afterTrash = await page.textContent('body')
if (afterTrash.includes('hello.js')) throw new Error('hello.js still listed after moving to trash')
console.log('OK moved hello.js to trash via context menu')

const api = {
  trashEntries: () => page.evaluate(() => window.electron.readdir(window.electron.trashPath)),
  readAllTrashInfo: () => page.evaluate(() => window.electron.readAllTrashInfo(window.electron.trashDirs().info)),
  invoke: (channel, ...args) => page.evaluate(({ channel, args }) => window.electron.ipcRenderer.invoke(channel, ...args), { channel, args }),
}

const trashBefore = await api.trashEntries()
if (!trashBefore.some(e => e.name === 'hello.js')) throw new Error('hello.js not present in Trash')
console.log('OK hello.js present in Trash')

const trashInfo = await api.readAllTrashInfo()
const helloInfo = trashInfo.find(i => i.trashName === 'hello.js')
if (!helloInfo || helloInfo.originalPath !== '/home/demo/hello.js') throw new Error('Trash info missing original path')
console.log('OK trash info records original path')

const restore = await api.invoke('trash-restore-items', [{ trashName: 'hello.js', originalPath: '/home/demo/hello.js' }], 'smoke-restore')
if (restore.errors) throw new Error('trash-restore-items failed: ' + restore.lastError)
const afterRestore = await api.trashEntries()
if (afterRestore.some(e => e.name === 'hello.js')) throw new Error('hello.js still in Trash after restore')
const backHome = await page.evaluate(() => window.electron.readdir('/home/demo'))
if (!backHome.some(e => e.name === 'hello.js')) throw new Error('hello.js not restored to home')
console.log('OK restored hello.js from trash')

const deep = await page.evaluate(async () => {
  const electron = window.electron
  const out = { pass: true, failures: [] }
  const check = (name, cond) => { if (!cond) { out.failures.push(name); out.pass = false } }

  check('join', electron.join('/home', 'demo', 'hello.js') === '/home/demo/hello.js')
  check('getUserName', electron.getUserName() === 'demo')

  const mkdir = await electron.mkdir('/home/demo/Documents/new-api-dir')
  const dirs = await electron.readdir('/home/demo/Documents')
  check('mkdir', dirs.some(e => e.name === 'new-api-dir' && e.type === 'directory'))
  check('isDir', await electron.isDir('/home/demo/Documents/new-api-dir'))
  check('stat', (await electron.stat('/home/demo/Documents/new-api-dir')).isDirectory())

  await electron.writeFile('/home/demo/Documents/new-api-dir/note.txt', 'api smoke\n')
  check('readFile', (await electron.readFile('/home/demo/Documents/new-api-dir/note.txt')) === 'api smoke\n')
  check('readFileSync', electron.readFileSync('/home/demo/Documents/new-api-dir/note.txt', 'utf8') === 'api smoke\n')
  const buf = electron.readFileSync('/home/demo/Documents/new-api-dir/note.txt', { encoding: 'buffer' })
  check('readFileSync-buffer', buf instanceof Uint8Array && buf.length === 'api smoke\n'.length)

  await electron.rename('/home/demo/Documents/new-api-dir/note.txt', '/home/demo/Documents/new-api-dir/renamed.txt')
  const afterRename = await electron.readdir('/home/demo/Documents/new-api-dir')
  check('rename', afterRename.some(e => e.name === 'renamed.txt') && !afterRename.some(e => e.name === 'note.txt'))

  check('getDirInfo', (await electron.getDirInfo('/home/demo/Documents/new-api-dir')).count === 1)

  const copyResult = await electron.ipcRenderer.invoke('file-copy', ['/home/demo/index.html'], '/home/demo/Documents/new-api-dir', 'smoke-copy')
  check('file-copy', !copyResult.errors && copyResult.copiedPaths.length === 1)
  const copied = await electron.readdir('/home/demo/Documents/new-api-dir')
  check('file-copy-result', copied.some(e => e.name === 'index.html'))

  const moveResult = await electron.ipcRenderer.invoke('move-file', '/home/demo/Documents/new-api-dir/index.html', '/home/demo/Documents/new-api-dir/moved.html', 'smoke-move')
  check('move-file', !!moveResult.success)
  const moved = await electron.readdir('/home/demo/Documents/new-api-dir')
  check('move-file-result', moved.some(e => e.name === 'moved.html') && !moved.some(e => e.name === 'index.html'))

  electron.clipboard.writeText('clipboard smoke')
  check('clipboard', electron.clipboard.readText() === 'clipboard smoke')
  check('get-from-clipboard', (await electron.ipcRenderer.invoke('get-from-clipboard')) === 'clipboard smoke')

  const searchDone = new Promise((resolve) => {
    window.addEventListener('message', function handler(ev) {
      if (ev.data && ev.data.type === '__search_batch') {
        if (ev.data.done) {
          window.removeEventListener('message', handler)
          resolve(ev.data.batch)
        }
      }
    })
  })
  const searchId = electron.startSearch({
    query: 'brown',
    location: '/home/demo',
    searchIn: 'Filenames and content',
    filetypes: [],
    includeHidden: false,
    useRegex: false,
  })
  check('startSearch', typeof searchId === 'string')
  const batch = await searchDone
  check('search-content', batch.some(e => e.name === 'example.txt'))
  electron.cancelSearch(searchId)

  const imgUri = await electron.getImageDataUri('/home/demo/Pictures/landscape.png')
  check('getImageDataUri', imgUri.startsWith('data:image/png;base64,'))

  const thumb = await electron.getThumbnail('/home/demo/Pictures/landscape.png', 128)
  check('getThumbnail', thumb && thumb.startsWith('data:image/png;base64,'))

  const openFake = { fake: true }
  const origOpen = window.open
  let openUrl = null
  window.open = (url) => { openUrl = String(url); return openFake }
  const openRes = await electron.openFile('/home/demo/hello.js')
  window.open = origOpen
  check('openFile', openRes.error === '')
  const openBlob = await fetch(openUrl).then(r => r.blob())
  check('openFile-mime', openBlob.type === 'text/javascript')

  const deleteResult = await electron.ipcRenderer.invoke('trash-items', ['/home/demo/Documents/new-api-dir/renamed.txt'], 'smoke-trash2')
  check('trash-items', !deleteResult.errors)
  const trashEntries2 = await electron.readdir(electron.trashPath)
  const renamedEntry = trashEntries2.find(e => e.name.startsWith('renamed.txt'))
  check('trash-items-result', !!renamedEntry)
  const permDelete = await electron.ipcRenderer.invoke('trash-permanent-delete', [electron.join(electron.trashDirs().files, renamedEntry.name)], 'smoke-del')
  check('trash-permanent-delete', !permDelete.errors)
  const trashAfter = await electron.readdir(electron.trashPath)
  check('trash-permanent-delete-result', !trashAfter.some(e => e.name.startsWith('renamed.txt')))

  return out
})
if (!deep.pass) throw new Error('API smoke failures: ' + deep.failures.join(', '))
console.log('OK deep web backend API checks passed')

let downloads = 0
page.on('download', () => { downloads++ })
const beforeTabs = page.context().pages().length
await page.evaluate(() => window.electron.openFile('/home/demo/Documents/example.txt'))
await page.waitForTimeout(1200)
const newTabs = page.context().pages().length - beforeTabs
if (newTabs < 1) throw new Error('Open file did not create a new tab')
const opened = page.context().pages().slice(beforeTabs)
const bodies = await Promise.all(opened.map(p => p.textContent('body').catch(() => '')))
if (!bodies.some(b => b.includes('quick brown fox'))) throw new Error('Opened file tab did not render file content')
if (downloads > 0) throw new Error('Opening a file triggered a download instead of a tab')
console.log('OK opening a file renders it in a new tab without downloading')

if (errors.length) {
  console.log('ERRORS:', errors)
  process.exit(1)
}

await browser.close()
console.log('ALL WEB SMOKE TESTS PASSED')
