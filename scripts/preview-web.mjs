import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const index = path.join(__dirname, '..', 'dist', 'index.html')

let cmd
let args
if (process.platform === 'darwin') {
  cmd = 'open'
  args = [index]
} else if (process.platform === 'win32') {
  cmd = 'cmd'
  args = ['/c', 'start', '', index]
} else {
  cmd = 'xdg-open'
  args = [index]
}

const child = spawn(cmd, args, { stdio: 'ignore', detached: true })
child.unref()
console.log('Opened', index)
