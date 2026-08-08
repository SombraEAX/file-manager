import { _electron } from 'playwright'
import * as path from 'path'
import * as fsp from 'fs/promises'
import * as os from 'os'

export const APP_PATH = path.join(__dirname, '..')

export async function launchApp() {
  const app = await _electron.launch({
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

export function createTempDir(prefix: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix + '-e2e-'))
}

export async function createTempFiles(dir: string, names: string[]): Promise<void> {
  await fsp.mkdir(dir, { recursive: true })
  for (const name of names) {
    await fsp.writeFile(path.join(dir, name), `content of ${name}`)
  }
}

export async function createTempDirWithFiles(dir: string, subFiles: Record<string, string>): Promise<void> {
  await fsp.mkdir(dir, { recursive: true })
  for (const [name, content] of Object.entries(subFiles)) {
    await fsp.writeFile(path.join(dir, name), content || `data-${name}`)
  }
}

export function fileExists(p: string): Promise<boolean> {
  return fsp.access(p).then(() => true).catch(() => false)
}

export async function readTrashInfo(trashName: string): Promise<string | null> {
  const infoPath = path.join(os.homedir(), '.local', 'share', 'Trash', 'info', trashName + '.trashinfo')
  try {
    const content = await fsp.readFile(infoPath, 'utf-8')
    const match = content.match(/Path=(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
