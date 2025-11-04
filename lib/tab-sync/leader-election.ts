export class LeaderElection {
  private isLeader = false
  private lockName: string
  private onLeaderChange?: (isLeader: boolean) => void
  private abortController: AbortController | null = null
  private usePolling = false
  private pollingInterval: NodeJS.Timeout | null = null

  constructor(lockName = 'sky-chat-leader') {
    this.lockName = lockName

    if (typeof window === 'undefined') {
      return
    }

    if (!('locks' in navigator)) {
      this.usePolling = true
      this.startPollingFallback()
    }
  }

  async requestLeadership(
    onLeaderChange?: (isLeader: boolean) => void
  ): Promise<void> {
    this.onLeaderChange = onLeaderChange

    if (this.usePolling) {
      return
    }

    try {
      this.abortController = new AbortController()

      await navigator.locks.request(
        this.lockName,
        { signal: this.abortController.signal },
        async () => {
          this.isLeader = true
          this.onLeaderChange?.(true)

          return new Promise<void>((resolve) => {
            this.abortController!.signal.addEventListener('abort', () => {
              this.isLeader = false
              this.onLeaderChange?.(false)
              resolve()
            })
          })
        }
      )
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Leader election failed:', error)
      }
    }
  }

  private startPollingFallback() {
    const checkLeadership = () => {
      try {
        const now = Date.now()
        const stored = localStorage.getItem(this.lockName)

        if (!stored) {
          this.becomeLeader()
          return
        }

        const { timestamp, tabId } = JSON.parse(stored)
        const currentTabId = this.getTabId()

        if (tabId === currentTabId) {
          this.becomeLeader()
        } else if (now - timestamp > 5000) {
          this.becomeLeader()
        } else if (this.isLeader) {
          this.isLeader = false
          this.onLeaderChange?.(false)
        }
      } catch (error) {
        console.error('Polling check failed:', error)
        this.becomeLeader()
      }
    }

    this.pollingInterval = setInterval(checkLeadership, 1000)
    checkLeadership()
  }

  private becomeLeader() {
    try {
      localStorage.setItem(
        this.lockName,
        JSON.stringify({
          tabId: this.getTabId(),
          timestamp: Date.now(),
        })
      )

      if (!this.isLeader) {
        this.isLeader = true
        this.onLeaderChange?.(true)
      }
    } catch (error) {
      console.error('Failed to become leader:', error)
    }
  }

  private getTabId(): string {
    let tabId = sessionStorage.getItem('tab-id')
    if (!tabId) {
      tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('tab-id', tabId)
    }
    return tabId
  }

  getIsLeader(): boolean {
    return this.isLeader
  }

  release() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    if (this.usePolling && this.isLeader) {
      try {
        localStorage.removeItem(this.lockName)
      } catch {}
    }

    this.isLeader = false
    this.onLeaderChange?.(false)
  }
}

