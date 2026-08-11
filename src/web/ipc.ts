import type { IpcRendererEvent } from 'electron'

type Listener = (event: IpcRendererEvent, ...args: unknown[]) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (event: IpcRendererEvent, ...args: any[]) => unknown

const FAKE_EVENT = { sender: { send: () => {} } } as unknown as IpcRendererEvent

export class WebIpc {
  private listeners = new Map<string, Set<Listener>>()
  private handlers = new Map<string, Handler>()

  onSend: ((channel: string, args: unknown[]) => void) | null = null

  on(channel: string, listener: Listener): this {
    let set = this.listeners.get(channel)
    if (!set) {
      set = new Set()
      this.listeners.set(channel, set)
    }
    set.add(listener)
    return this
  }

  once(channel: string, listener: Listener): this {
    const wrapper: Listener = (event, ...args) => {
      this.removeListener(channel, wrapper)
      listener(event, ...args)
    }
    return this.on(channel, wrapper)
  }

  removeListener(channel: string, listener: Listener): this {
    const set = this.listeners.get(channel)
    if (set) set.delete(listener)
    return this
  }

  removeAllListeners(channel?: string): this {
    if (channel) {
      this.listeners.delete(channel)
    } else {
      this.listeners.clear()
    }
    return this
  }

  send(channel: string, ...args: unknown[]): void {
    if (this.onSend) this.onSend(channel, args)
  }

  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.handlers.get(channel)
    if (!handler) {
      return Promise.reject(new Error(`No handler registered for "${channel}"`))
    }
    try {
      return Promise.resolve(handler(FAKE_EVENT, ...args))
    } catch (e) {
      return Promise.reject(e)
    }
  }

  handle(channel: string, handler: Handler): void {
    this.handlers.set(channel, handler)
  }

  emit(channel: string, ...args: unknown[]): void {
    const set = this.listeners.get(channel)
    if (!set) return
    for (const listener of Array.from(set)) {
      listener(FAKE_EVENT, ...args)
    }
  }
}

export function createSender(ipc: WebIpc) {
  return {
    send: (channel: string, ...args: unknown[]) => ipc.emit(channel, ...args),
  }
}
