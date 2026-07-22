const listeners = {}

export function emit(event, ...args) {
  const fns = listeners[event]
  if (fns) fns.forEach(fn => fn(...args))
}

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(fn)
}

export function off(event, fn) {
  const fns = listeners[event]
  if (fns) {
    const idx = fns.indexOf(fn)
    if (idx !== -1) fns.splice(idx, 1)
  }
}
