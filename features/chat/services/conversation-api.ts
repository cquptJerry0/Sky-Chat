/**
 * Conversation API Service
 *
 * 会话消息相关的 API 调用封装
 * 注：会话 CRUD 和分享已迁移到 Server Actions (app/actions/conversation.ts)
 */

class HTTPError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'HTTPError'
  }
}

export interface Message {
  id: string
  conversationId: string
  role: string
  content: string
  thinking?: string
  toolCalls?: unknown
  createdAt: string
}

export const ConversationAPI = {
  /**
   * 获取会话的所有消息
   */
  async getMessages(id: string): Promise<{ messages: Message[] }> {
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      if (res.status === 404) {
        throw new HTTPError('Conversation not found', 404)
      }
      throw new Error('Failed to fetch messages')
    }

    return res.json()
  },
}
