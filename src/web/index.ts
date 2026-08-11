import { createWebElectronApi } from './backend'

export const IS_WEB = typeof window !== 'undefined' && !('electron' in window)

export function isWeb(): boolean {
  return IS_WEB
}

export function installWebPlatform(): void {
  if (!IS_WEB || window.electron) return
  window.electron = createWebElectronApi()
  localStorage.setItem('useHtmlMenus', 'true')
}
