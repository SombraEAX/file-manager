import { describe, it, expect, beforeEach } from 'vitest'
import { theme, themeState, applyTheme, loadThemes } from '../theme'

function clearStoredElectron() {
  delete (window as unknown as { electron?: unknown }).electron
}

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStoredElectron()
  })

  it('defaults to the light theme', () => {
    expect(themeState.current).toBe('light')
    expect(theme.background).toBeDefined()
    expect(theme.menu.background).toBeDefined()
  })

  it('applies the dark theme', async () => {
    await applyTheme('dark')
    expect(themeState.current).toBe('dark')
    expect(theme.background).toMatch(/^#/)
    expect(theme.background).not.toBe('#fff')
    expect(theme.dark).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('switches back to the light theme', async () => {
    await applyTheme('dark')
    await applyTheme('light')
    expect(themeState.current).toBe('light')
    expect(theme.background).toBe('#fff')
  })

  it('loads user themes from window.electron.listThemes', async () => {
    const win = window as unknown as { electron?: unknown }
    win.electron = {
      listThemes: async () => ['custom', 'light'],
      readTheme: async () => null,
    }
    await loadThemes()
    expect(themeState.list).toContain('custom')
    expect(themeState.list).toContain('light')
    expect(themeState.list).toContain('dark')
  })

  it('applies a user theme loaded via window.electron.readTheme', async () => {
    const win = window as unknown as { electron?: unknown }
    win.electron = {
      listThemes: async () => ['custom'],
      readTheme: async (name: string) => name === 'custom' ? JSON.stringify({ background: '#123456' }) : null,
    }
    await applyTheme('custom')
    expect(themeState.current).toBe('custom')
    expect(theme.background).toBe('#123456')
  })

  it('merges a partial user theme over the light defaults', async () => {
    const win = window as unknown as { electron?: unknown }
    win.electron = {
      listThemes: async () => ['partial'],
      readTheme: async (name: string) => name === 'partial' ? JSON.stringify({ dark: true, background: '#111111' }) : null,
    }
    await applyTheme('partial')
    expect(theme.background).toBe('#111111')
    expect(theme.dark).toBe(true)
    expect(theme.fontColor).toBe('#000')
    expect(theme.menu.background).toBeDefined()
    expect(theme.input.background).toBeDefined()
  })

  it('ignores unknown themes', async () => {
    const before = themeState.current
    await applyTheme('nope')
    expect(themeState.current).toBe(before)
  })

  it('does not throw when window.electron is missing', async () => {
    clearStoredElectron()
    await expect(loadThemes()).resolves.toBeUndefined()
    expect(themeState.list).toEqual(['light', 'dark', 'contrast-dark'])
    await expect(applyTheme('light')).resolves.toBeUndefined()
  })
})
