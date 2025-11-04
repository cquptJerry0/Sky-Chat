import type {
  SyncMessage,
  SyncEventType,
  SyncEventMap,
} from './types'

export class TabSyncManager {
  private channel: BroadcastChannel | null = null
  private useFallback = false
  private tabId: string
  private listeners: Map<
    SyncEventType,
    Set<(payload: SyncEventMap[SyncEventType]) => void>
  > = new Map()

  constructor(channelName = 'sky-chat-sync') {
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (typeof window === 'undefined') {
      return
    }

    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(channelName)
        this.channel.onmessage = (event: MessageEvent) => {
          const message = event.data as SyncMessage
          if (message.tabId !== this.tabId) {
            this.notifyListeners(message.type, message.payload)
          }
        }
      } catch (error) {
        this.setupFallback()
      }
    } else {
      this.setupFallback()
    }
  }

  private setupFallback() {
    this.useFallback = true
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key !== 'sky-chat-sync' || !event.newValue) {
          return
        }

        try {
          const message = JSON.parse(event.newValue) as SyncMessage
          if (message.tabId !== this.tabId) {
            this.notifyListeners(message.type, message.payload)
          }
        } catch (error) {
          console.error('Failed to parse storage event:', error)
        }
      })
    }
  }

  private notifyListeners<T extends SyncEventType>(
    type: T,
    payload: SyncEventMap[T]
  ) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(payload)
        } catch (error) {
          console.error(`Listener error for ${type}:`, error)
        }
      })
    }
  }

  broadcast<T extends SyncEventType>(type: T, payload: SyncEventMap[T]) {
    const message: SyncMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: this.tabId,
    }

    if (this.channel) {
      try {
        this.channel.postMessage(message)
      } catch (error) {
        console.error('Broadcast failed:', error)
      }
    } else if (this.useFallback && typeof window !== 'undefined') {
      try {
        localStorage.setItem('sky-chat-sync', JSON.stringify(message))
        setTimeout(() => {
          try {
            localStorage.removeItem('sky-chat-sync')
          } catch {}
        }, 100)
      } catch (error) {
        console.error('Fallback broadcast failed:', error)
      }
    }
  }

  on<T extends SyncEventType>(
    type: T,
    listener: (payload: SyncEventMap[T]) => void
  ) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener as (payload: SyncEventMap[SyncEventType]) => void)
  }

  off<T extends SyncEventType>(
    type: T,
    listener: (payload: SyncEventMap[T]) => void
  ) {
    this.listeners.get(type)?.delete(listener as (payload: SyncEventMap[SyncEventType]) => void)
  }

  getTabId() {
    return this.tabId
  }

  close() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }
}
