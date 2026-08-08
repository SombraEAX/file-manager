type Listener = (...args: unknown[]) => void

const listeners: Record<string, Listener[]> = {}

export function emit<T extends unknown[]>(event: string, ...args: T): void {
  const fns = listeners[event]
  if (fns) fns.forEach(fn => fn(...args))
}

export function on<T extends unknown[]>(event: string, fn: (...args: T) => void): void {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(fn as Listener)
}

export function off<T extends unknown[]>(event: string, fn: (...args: T) => void): void {
  const fns = listeners[event]
  if (fns) {
    const idx = fns.indexOf(fn as Listener)
    if (idx !== -1) fns.splice(idx, 1)
  }
}
