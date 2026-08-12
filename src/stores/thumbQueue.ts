const MAX_CONCURRENT = 6

interface PendingTask {
  path: string
  size: number
  resolve: (uri: string | null) => void
}

const pending: PendingTask[] = []
const inFlight = new Map<string, Promise<string | null>>()
let active = 0

function keyOf(path: string, size: number): string {
  return path + '|' + size
}

function pump() {
  while (active < MAX_CONCURRENT && pending.length) {
    const task = pending[0]
    pending.shift()
    const key = keyOf(task.path, task.size)
    active++
    window.electron.getThumbnail(task.path, task.size)
      .then(task.resolve)
      .catch(() => task.resolve(null))
      .finally(() => {
        active--
        inFlight.delete(key)
        pump()
      })
  }
}

export function requestThumbnail(path: string, size: number): Promise<string | null> {
  const key = keyOf(path, size)
  const existing = inFlight.get(key)
  if (existing) return existing
  const promise = new Promise<string | null>((resolve) => {
    pending.push({ path, size, resolve })
  })
  inFlight.set(key, promise)
  pump()
  return promise
}
