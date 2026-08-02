const { _electron: electron } = require('playwright')
const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')

const APP_PATH = path.join(__dirname, '..')

async function launchApp() {
  const app = await electron.launch({
    args: [APP_PATH],
    env: { ...process.env, NODE_ENV: 'production', SLOW_FS: '1' },
  })
  const window = await app.firstWindow({ timeout: 100000 })
  await window.waitForLoadState('domcontentloaded', { timeout: 100000 }).catch(() => {})
  try {
    await window.waitForSelector('.breadcrumbs', { timeout: 100000 })
  } catch {}
  await window.waitForTimeout(2000)
  return { app, window }
}

function createTempDir(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix + '-e2e-'))
}

async function createTempFiles(dir, names) {
  await fsp.mkdir(dir, { recursive: true })
  for (const name of names) {
    await fsp.writeFile(path.join(dir, name), `content of ${name}`)
  }
}

async function createTempDirWithFiles(dir, subFiles) {
  await fsp.mkdir(dir, { recursive: true })
  for (const [name, content] of Object.entries(subFiles)) {
    await fsp.writeFile(path.join(dir, name), content || `data-${name}`)
  }
}

function fileExists(p) {
  return fsp.access(p).then(() => true).catch(() => false)
}

async function readTrashInfo(trashName) {
  const infoPath = path.join(os.homedir(), '.local', 'share', 'Trash', 'info', trashName + '.trashinfo')
  try {
    const content = await fsp.readFile(infoPath, 'utf-8')
    const match = content.match(/Path=(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

module.exports = { launchApp, createTempDir, createTempFiles, createTempDirWithFiles, fileExists, readTrashInfo, APP_PATH }
