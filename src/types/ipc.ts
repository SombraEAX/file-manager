import type { IpcRendererEvent } from 'electron'
import type { Stats } from 'fs'

export interface EntryStats {
  name: string
  path: string
  type: string | null
  filetype: string
  modified?: Date
  mode?: number
  ext?: string
  size?: number
  mtimeMs?: number
  selected?: boolean
}

export interface SearchParams {
  query: string
  location: string
  searchIn: string
  filetypes: string[]
  includeHidden: boolean
  useRegex: boolean
}

export interface TrashDirs {
  dir: string
  files: string
  info: string
}

export interface TrashInfoEntry {
  trashName: string
  originalPath: string
}

export interface DirInfo {
  size: number
  count: number
}

export interface MenuItemSpec {
  id?: string
  label?: string
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
  role?: string
  checked?: boolean
  enabled?: boolean
  visible?: boolean
  submenu?: MenuItemSpec[]
}

export interface MenuRequest {
  items: MenuItemSpec[]
  x: number
  y: number
}

export interface HistoryMenuRequest {
  history: string[]
  current: number
  x: number
  y: number
}

export interface TaskProgress {
  done: number
  total: number
  errors: number
  copiedBytes: number
  totalBytes: number
  currentFile: string
  cancelled?: boolean
}

export interface PermanentDeleteProgress {
  done: number
  total: number
  errors: number
  currentFile: string
}

export interface MoveProgress {
  taskId: string | number
  copiedBytes: number
}

export interface TrashItem {
  trashName: string
  originalPath: string
}

export interface MoveUndoItem {
  dest: string
  original: string
}

export interface MoveResult {
  success?: boolean
  cancelled?: boolean
  error?: string
}

export interface TaskResult {
  done: number
  total: number
  errors: number
  lastError: string
  cancelled?: boolean
  copiedPaths?: string[]
}

type TaskControlChannel =
  | 'trash-cancel'
  | 'trash-restore-cancel'
  | 'trash-delete-cancel'
  | 'file-copy-cancel'
  | 'move-cancel'
  | 'move-undo-cancel'

type TaskPauseChannel =
  | 'trash-pause'
  | 'trash-restore-pause'
  | 'trash-delete-pause'
  | 'file-copy-pause'

type TaskResumeChannel =
  | 'trash-resume'
  | 'trash-restore-resume'
  | 'trash-delete-resume'
  | 'file-copy-resume'

type ProgressChannel = 'trash-progress' | 'file-copy-progress' | 'trash-restore-progress'

type ProgressListener = (event: IpcRendererEvent, data: TaskProgress) => void

export interface ElectronIpc {
  send(channel: 'show-menu-bar-submenu', request: MenuRequest): void
  send(channel: 'show-menu', request: MenuRequest): void
  send(channel: 'show-history-menu', request: HistoryMenuRequest): void
  send(channel: 'copy-to-clipboard', text: string): void
  send(channel: 'open-external', url: string): void
  send(channel: TaskControlChannel, taskId: string | number): void
  send(channel: TaskPauseChannel, taskId: string | number): void
  send(channel: TaskResumeChannel, taskId: string | number): void

  on(channel: 'show-menu-bar-submenu-reply', listener: (event: IpcRendererEvent, id: string) => void): this
  on(channel: 'show-menu-reply', listener: (event: IpcRendererEvent, index: number) => void): this
  on(channel: 'show-history-menu-reply', listener: (event: IpcRendererEvent, index: number) => void): this
  on(channel: 'move-progress', listener: (event: IpcRendererEvent, data: MoveProgress) => void): this
  on(channel: ProgressChannel, listener: ProgressListener): this
  on(channel: 'trash-permanent-delete-progress', listener: (event: IpcRendererEvent, data: PermanentDeleteProgress) => void): this

  once(channel: 'show-menu-bar-submenu-reply', listener: (event: IpcRendererEvent, id: string) => void): this
  once(channel: 'show-menu-reply', listener: (event: IpcRendererEvent, index: number) => void): this
  once(channel: 'show-history-menu-reply', listener: (event: IpcRendererEvent, index: number) => void): this
  once(channel: 'move-progress', listener: (event: IpcRendererEvent, data: MoveProgress) => void): this
  once(channel: ProgressChannel, listener: ProgressListener): this
  once(channel: 'trash-permanent-delete-progress', listener: (event: IpcRendererEvent, data: PermanentDeleteProgress) => void): this

  invoke(channel: 'open-directory-dialog'): Promise<string | null>
  invoke(channel: 'get-from-clipboard'): Promise<string>
  invoke(channel: 'open-file', pathname: string): Promise<{ error: string }>
  invoke(channel: 'get-dir-info', dirPath: string): Promise<DirInfo>
  invoke(channel: 'move-file', src: string, dest: string, taskId: string | number): Promise<MoveResult>
  invoke(channel: 'trash-items', paths: string[], taskId: string | number): Promise<TaskResult>
  invoke(channel: 'file-copy', paths: string[], destDir: string, taskId: string | number): Promise<TaskResult>
  invoke(channel: 'trash-restore-items', items: TrashItem[], taskId: string | number): Promise<TaskResult>
  invoke(channel: 'trash-permanent-delete', paths: string[], taskId: string | number): Promise<TaskResult>
  invoke(channel: 'copy-undo', copiedPaths: string[], taskId: string | number): Promise<TaskResult>
  invoke(channel: 'move-undo', items: MoveUndoItem[], taskId: string | number): Promise<TaskResult>

  removeListener(channel: string, listener: (...args: unknown[]) => void): this
  removeAllListeners(channel?: string): this
}

export interface ElectronAPI {
  readdir: (addr: string) => Promise<EntryStats[]>
  clipboard: {
    writeText: (text: string) => void
    readText: () => string
  }
  readdirSync: typeof import('fs').readdirSync
  readFileSync: typeof import('fs').readFileSync
  join: (...parts: string[]) => string
  startSearch: (params: SearchParams) => string
  cancelSearch: (id: string) => void
  ipcRenderer: ElectronIpc
  readFile: (path: string, encoding?: string) => Promise<string>
  getImageDataUri: (path: string) => Promise<string>
  openExternal: (url: string) => void
  trashPath: string
  trashDirs: () => TrashDirs
  openFile: (pathname: string) => Promise<{ error: string }>
  getDirInfo: (pathname: string) => Promise<DirInfo>
  getUserName: () => string
  isDir: (pathname: string) => Promise<boolean>
  stat: (pathname: string) => Promise<Stats>
  rename: (oldPath: string, newPath: string) => Promise<void>
  mkdir: (pathname: string) => Promise<void>
  writeFile: (pathname: string, content: string) => Promise<void>
  readTrashInfo: (infoDir: string) => Promise<Record<string, string>>
  readAllTrashInfo: (infoDir: string) => Promise<TrashInfoEntry[]>
}
