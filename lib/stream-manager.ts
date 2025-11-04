interface StreamSession {
  id: string
  messageId: string
  fullContent: string
  sentLength: number
  timestamp: number
}

const sessions = new Map<string, StreamSession>()

export class StreamManager {
  static create(messageId: string, fullContent: string): string {
    this.cleanupOld()
    const sessionId = `${messageId}-${Date.now()}`
    sessions.set(sessionId, {
      id: sessionId,
      messageId,
      fullContent,
      sentLength: 0,
      timestamp: Date.now(),
    })
    return sessionId
  }

  static get(sessionId: string): StreamSession | null {
    this.cleanupOld()
    return sessions.get(sessionId) || null
  }

  static updateProgress(sessionId: string, sentLength: number) {
    const session = sessions.get(sessionId)
    if (session) {
      session.sentLength = sentLength
      session.timestamp = Date.now()
    }
  }

  static cleanup(sessionId: string) {
    sessions.delete(sessionId)
  }

  static cleanupOld() {
    const now = Date.now()
    for (const [id, session] of sessions.entries()) {
      if (now - session.timestamp > 5 * 60 * 1000) {
        sessions.delete(id)
      }
    }
  }
}

