import type { EntryStats } from './ipc'

export interface Tab {
  id: number
  history: string[]
  historyIndex: number
  scrollTop: number
}

export interface Group {
  name: string | null
  entries: EntryStats[]
}

export interface Column {
  caption: string
  width: number
  visible: boolean
  colname: string
  field: string
}

export interface DirItem {
  name: string
  pathname: string
  caption?: string
  open?: boolean
  dirs?: DirItem[]
}

export interface Section {
  title: string
  dirs: DirItem[]
}

export interface VirtualHeader {
  type: 'header'
  group: Group
  height: number
  key: string
  offset: number
}

export interface VirtualEntry {
  type: 'entry'
  entry: EntryStats
  group: Group
  height: number
  key: string
  path: string
  offset: number
}

export interface VirtualRow {
  type: 'row'
  entries: EntryStats[]
  paths: string[]
  group: Group
  height: number
  key: string
  offset: number
}

export type VirtualItem = VirtualHeader | VirtualEntry | VirtualRow

export interface EntryRect {
  path: string
  y: number
  height: number
  x: number
  width: number
}

export interface RubberBand {
  vx: number
  vy: number
  vw: number
  vh: number
}

export interface PropsInfo {
  name?: string
  location?: string
  typeText?: string
  sizeText?: string
  countText?: string
  modifiedText?: string
  createdText?: string
  permissionsText?: string
}

export interface PropsRow {
  label: string
  value: string
  path?: boolean
}

export interface HotkeyRow {
  keys: string
  action: string
}

export type DropDownOption = string | { label?: string; value?: string }

export interface SelectEvent {
  path: string
  ctrl: boolean
  shift: boolean
}

export interface ContextMenuEvent {
  path: string
  x: number
  y: number
}

export interface BackgroundContextMenuEvent {
  x: number
  y: number
}

export interface DirContextMenuEvent {
  pathname: string
  x: number
  y: number
}

export interface SearchResultsEvent {
  query: string
  results: EntryStats[] | null
}

export interface XdgDirMap {
  [key: string]: string
}
