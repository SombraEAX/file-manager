import { reactive } from 'vue'
import lightTheme from '../../themes/light.json'
import darkTheme from '../../themes/dark.json'
import contrastDarkTheme from '../../themes/contrast-dark.json'

type Widen<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : { [K in keyof T]: Widen<T[K]> }

type ThemeData = Widen<typeof lightTheme>

const bundledThemes: Record<string, ThemeData> = {
  light: lightTheme,
  dark: darkTheme,
  'contrast-dark': contrastDarkTheme,
}

function savedThemeName(): string {
  try {
    return localStorage.getItem('theme') || 'light'
  } catch (e) {
    return 'light'
  }
}

export const theme = reactive(JSON.parse(JSON.stringify(bundledThemes.light))) as ThemeData

export const themeState = reactive({
  list: Object.keys(bundledThemes),
  current: savedThemeName(),
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(override)) {
    const baseValue = out[key]
    const overrideValue = override[key]
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      out[key] = deepMerge(baseValue, overrideValue)
    } else {
      out[key] = overrideValue
    }
  }
  return out
}

function replaceTheme(source: Record<string, unknown>): void {
  const target = theme as unknown as Record<string, unknown>
  for (const key of Object.keys(target)) {
    delete target[key]
  }
  Object.assign(target, JSON.parse(JSON.stringify(source)))
}

export async function loadThemes(): Promise<void> {
  const names: string[] = [...Object.keys(bundledThemes)]
  try {
    if (window.electron && window.electron.listThemes) {
      const extra = await window.electron.listThemes()
      if (Array.isArray(extra)) {
        for (const name of extra) {
          if (typeof name === 'string' && !names.includes(name)) names.push(name)
        }
      }
    }
  } catch (e) {
    // keep bundled themes only
  }
  themeState.list = names
}

export async function applyTheme(name: string): Promise<void> {
  let source: ThemeData | undefined = bundledThemes[name]
  if (!source && window.electron && window.electron.readTheme) {
    try {
      const raw = await window.electron.readTheme(name)
      if (raw) source = JSON.parse(raw) as ThemeData
    } catch (e) {
      source = undefined
    }
  }
  if (!source) return
  const merged = deepMerge(
    bundledThemes.light as unknown as Record<string, unknown>,
    source as unknown as Record<string, unknown>,
  )
  replaceTheme(merged)
  themeState.current = name
  try {
    localStorage.setItem('theme', name)
  } catch (e) {
    // ignore storage errors
  }
}
