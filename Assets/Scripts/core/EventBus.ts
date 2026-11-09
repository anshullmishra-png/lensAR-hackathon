import {Log} from "../util/Log"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (payload?: any) => void

/**
 * Minimal publish/subscribe. A handler that throws is logged and never stops the
 * other handlers. Plain module (no scene object): every script imports the same `bus`.
 */
export class EventBus {
  private handlers = new Map<string, Handler[]>()

  on(event: string, handler: Handler): void {
    const list = this.handlers.get(event) ?? []
    list.push(handler)
    this.handlers.set(event, list)
  }

  off(event: string, handler: Handler): void {
    const list = this.handlers.get(event)
    if (!list) {
      return
    }
    this.handlers.set(
      event,
      list.filter((h) => h !== handler)
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, payload?: any): void {
    const list = this.handlers.get(event)
    if (!list) {
      return
    }
    // Copy: handlers may call off() while we iterate.
    for (const handler of list.slice()) {
      try {
        handler(payload)
      } catch (e) {
        Log.error(`Handler for ${event} threw: ${e}`)
      }
    }
  }
}

export const bus = new EventBus()
