const homedir = `/home/${window.electron.getUserName()}`

const keyByVar: Record<string, string> = {
  XDG_DOWNLOAD_DIR: 'downloads',
  XDG_DOCUMENTS_DIR: 'documents',
  XDG_MUSIC_DIR: 'music',
  XDG_PICTURES_DIR: 'pictures',
  XDG_VIDEOS_DIR: 'videos',
  XDG_DESKTOP_DIR: 'desktop',
  XDG_PUBLICSHARE_DIR: 'public'
}

let cache: Record<string, string> | null = null

function parseXdgDirs(): Record<string, string> {
  if (cache) return cache
  cache = {}
  try {
    const content = window.electron.readFileSync(window.electron.join(homedir, '.config/user-dirs.dirs'), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^(\w+)="?\$HOME\/(.+?)"?$/)
      if (m && keyByVar[m[1]]) cache[keyByVar[m[1]]] = window.electron.join(homedir, m[2])
    }
  } catch(e) {}
  return cache
}

export function getXdgPath(key: string): string | null {
  return parseXdgDirs()[key] || null
}

export function getXdgBasename(pathname: string): string {
  return pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || '/'
}

export function getXdgTypeByBasename(basename: string): string | null {
  const dirs = parseXdgDirs()
  for(const key in dirs){
    if(getXdgBasename(dirs[key]) === basename) return key
  }
  return null
}
