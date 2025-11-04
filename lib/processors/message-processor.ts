import type { SSEData, Message } from '@/lib/types/chat'

export class MessageProcessor {
  static parseSSE(chunk: string): SSEData[] {
    return chunk
      .split('\n')
      .filter((line) => line.trim().startsWith('data: '))
      .map((line) => {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return null
        try {
          return JSON.parse(data) as SSEData
        } catch {
          return null
        }
      })
      .filter((d): d is SSEData => d !== null)
  }

  static updateMessage(
    messages: Message[],
    messageId: string,
    sseData: SSEData
  ): Message[] {
    return messages.map((msg) => {
      if (msg.id !== messageId) return msg

      const updates: Partial<Message> = {}

      switch (sseData.type) {
        case 'thinking':
          updates.thinking = (msg.thinking || '') + (sseData.content || '')
          break
        case 'answer':
          updates.content = msg.content + (sseData.content || '')
          break
        case 'tool_calls':
          updates.toolCalls = sseData.tool_calls
          break
      }

      return { ...msg, ...updates }
    })
  }

  static createMessage(role: 'user' | 'assistant', content = ''): Message {
    return {
      id: `${role}-${Date.now()}`,
      role,
      content,
      isStreaming: role === 'assistant',
    }
  }

  static completeMessage(messages: Message[], messageId: string): Message[] {
    return messages.map((msg) =>
      msg.id === messageId ? { ...msg, isStreaming: false } : msg
    )
  }

  static markError(messages: Message[], messageId: string): Message[] {
    return messages.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content: msg.content || '抱歉，发生了错误',
            hasError: true,
            isStreaming: false,
          }
        : msg
    )
  }
}
