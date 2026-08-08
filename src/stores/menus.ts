import { reactive } from 'vue'
import type { MenuItemSpec } from '../types/ipc'
import { emit, on } from './events'

export interface MenuState {
  useHtmlMenus: boolean
  open: boolean
  items: MenuItemSpec[]
  x: number
  y: number
}

export interface MenuSelectPayload {
  item: MenuItemSpec
  index: number
}

export const menuState = reactive<MenuState>({
  useHtmlMenus: localStorage.getItem('useHtmlMenus') === 'true',
  open: false,
  items: [],
  x: 0,
  y: 0,
})

let pendingResolve: ((payload: MenuSelectPayload) => void) | null = null

on('menu-popup-select', (payload: MenuSelectPayload) => {
  if (pendingResolve) {
    const fn = pendingResolve
    pendingResolve = null
    menuState.open = false
    fn(payload)
  }
})

export function toggleHtmlMenus(): void {
  menuState.useHtmlMenus = !menuState.useHtmlMenus
  localStorage.setItem('useHtmlMenus', String(menuState.useHtmlMenus))
}

export function openHtmlMenu(items: MenuItemSpec[], x: number, y: number): Promise<MenuSelectPayload> {
  return new Promise(resolve => {
    pendingResolve = resolve
    menuState.items = items
    menuState.x = x
    menuState.y = y
    menuState.open = true
  })
}

export function closeHtmlMenu(): void {
  pendingResolve = null
  menuState.open = false
}

export function selectMenuPopup(payload: MenuSelectPayload): void {
  emit('menu-popup-select', payload)
}

export function openMenu(items: MenuItemSpec[], x: number, y: number): Promise<number> {
  if (menuState.useHtmlMenus) {
    return openHtmlMenu(items, x, y).then(payload => payload.index)
  }
  return new Promise(resolve => {
    window.electron.ipcRenderer.send('show-menu', { items, x, y })
    window.electron.ipcRenderer.once('show-menu-reply', (_, index) => resolve(index))
  })
}

export function openMenuBarSubmenu(items: MenuItemSpec[], x: number, y: number): Promise<string> {
  if (menuState.useHtmlMenus) {
    return openHtmlMenu(items, x, y).then(payload => payload.item.id || '')
  }
  return new Promise(resolve => {
    window.electron.ipcRenderer.send('show-menu-bar-submenu', { items, x, y })
    window.electron.ipcRenderer.once('show-menu-bar-submenu-reply', (_, id) => resolve(id))
  })
}

export function openHistoryMenu(
  history: string[],
  current: number,
  x: number,
  y: number
): Promise<number> {
  if (menuState.useHtmlMenus) {
    const items: MenuItemSpec[] = history.map((pathname, i) => ({
      label: pathname,
      type: 'radio',
      checked: i === current,
    }))
    return openHtmlMenu(items, x, y).then(payload => payload.index)
  }
  return new Promise(resolve => {
    window.electron.ipcRenderer.send('show-history-menu', { history, current, x, y })
    window.electron.ipcRenderer.once('show-history-menu-reply', (_, index) => resolve(index))
  })
}
