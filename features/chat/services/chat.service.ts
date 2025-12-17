/**
 * Chat Service - 业务逻辑
 * 
 * 处理消息发送、加载、流式解析等
 * 不依赖 React，纯业务逻辑
 */

import { nanoid } from 'nanoid'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ConversationAPI } from '@/lib/services/conversation-api'
import { SSEParser } from '@/lib/services/sse-parser'
import type { Message, FileAttachment } from '@/features/chat/types/chat'

// 用于取消请求
let loadAbortController: AbortController | null = null

export const ChatService = {
  /**
   * 加载会话消息
   */
  async loadMessages(conversationId: string): Promise<void> {
    const store = useChatStore.getState()
    
    // 防止重复加载
    if (store.loadingConversationId === conversationId) return
    
    // 如果正在发送消息，不要加载（避免清掉正在发送的消息）
    if (store.isSendingMessage) return
    
    // 取消之前的请求
    loadAbortController?.abort()
    loadAbortController = new AbortController()
    
    store.setLoadingMessages(true, conversationId)
    
    try {
      const { messages } = await ConversationAPI.getMessages(conversationId)
      
      // 检查是否过期或正在发送消息
      const currentState = useChatStore.getState()
      if (currentState.loadingConversationId !== conversationId) return
      if (currentState.isSendingMessage) return // 不要覆盖正在发送的消息
      
      // 去重
      const unique = messages.filter((msg, i, arr) => 
        arr.findIndex(m => m.id === msg.id) === i
      ) as Message[]
      
      store.setMessages(unique)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      console.error('[ChatService] loadMessages failed:', e)
    } finally {
      loadAbortController = null
      store.setLoadingMessages(false)
    }
  },

  /**
   * 发送消息
   */
  async sendMessage(
    conversationId: string,
    content: string,
    options: { createUserMessage?: boolean; attachments?: FileAttachment[] } = {}
  ): Promise<void> {
    const { createUserMessage = true, attachments } = options
    const store = useChatStore.getState()
    
    if (store.isSendingMessage) return
    store.setSendingMessage(true)
    
    const userMessageId = createUserMessage ? nanoid() : undefined
    const aiMessageId = nanoid()
    
    // 添加用户消息
    if (createUserMessage && userMessageId) {
      store.addMessage({
        id: userMessageId,
        role: 'user',
        content,
        attachments,
      })
    }
    
    // 添加 AI 占位消息
    store.addMessage({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      thinking: '',
      displayState: 'waiting',
    })
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          conversationId,
          model: store.selectedModel,
          enableThinking: store.enableThinking,
          thinkingBudget: 4096,
          userMessageId,
          aiMessageId,
          attachments,
        }),
      })
      
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      
      await this.handleStream(reader, aiMessageId)
    } catch (e) {
      console.error('[ChatService] sendMessage failed:', e)
      store.updateMessage(aiMessageId, { hasError: true, displayState: 'error' })
      store.stopStreaming()
    } finally {
      store.setSendingMessage(false)
    }
  },

  /**
   * 处理 SSE 流
   */
  async handleStream(reader: ReadableStreamDefaultReader<Uint8Array>, messageId: string): Promise<void> {
    await SSEParser.parseStream(reader, {
      onData: (data) => {
        const s = useChatStore.getState()
        
        if (data.type === 'thinking' && data.content) {
          if (s.streamingPhase !== 'thinking') {
            s.startStreaming(messageId, 'thinking')
            s.updateMessage(messageId, { displayState: 'streaming' })
          }
          s.appendThinking(messageId, data.content)
        } else if (data.type === 'answer' && data.content) {
          if (s.streamingPhase !== 'answer') {
            s.startStreaming(messageId, 'answer')
            s.updateMessage(messageId, { displayState: 'streaming' })
          }
          s.appendContent(messageId, data.content)
        } else if (data.type === 'complete') {
          s.stopStreaming()
          s.updateMessage(messageId, { displayState: 'idle' })
        }
      },
      onError: (error) => {
        console.error('[ChatService] stream error:', error)
        const s = useChatStore.getState()
        s.updateMessage(messageId, { hasError: true, displayState: 'error' })
        s.stopStreaming()
      },
      onComplete: () => {
        const s = useChatStore.getState()
        s.stopStreaming()
        s.updateMessage(messageId, { displayState: 'idle' })
      },
    })
  },

  /**
   * 重试消息
   */
  async retryMessage(conversationId: string, messageId: string): Promise<void> {
    const store = useChatStore.getState()
    
    if (store.streamingMessageId) {
      store.stopStreaming('user_retry')
    }
    
    const index = store.messages.findIndex(m => m.id === messageId)
    if (index === -1) return
    
    const message = store.messages[index]
    if (message.role !== 'assistant') return
    
    // 删除从该消息开始的所有消息
    const removed = store.removeMessagesFrom(index)
    const idsToDelete = removed.map(m => m.id)
    
    // 找到最后一条用户消息
    const lastUserMsg = [...store.messages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return
    
    // 后台删除数据库记录
    if (idsToDelete.length > 0) {
      fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: idsToDelete }),
      }).catch(console.error)
    }
    
    // 重新发送
    await this.sendMessage(conversationId, lastUserMsg.content, { createUserMessage: false })
  },

  /**
   * 编辑并重发
   */
  async editAndResend(conversationId: string, messageId: string, newContent: string): Promise<void> {
    const store = useChatStore.getState()
    const index = store.messages.findIndex(m => m.id === messageId)
    
    if (index === -1) return
    if (store.messages[index].role !== 'user') return
    
    // 删除从该消息开始的所有消息
    const removed = store.removeMessagesFrom(index)
    const idsToDelete = removed.map(m => m.id)
    
    // 后台删除
    if (idsToDelete.length > 0) {
      fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: idsToDelete }),
      }).catch(console.error)
    }
    
    // 发送新内容
    await this.sendMessage(conversationId, newContent, { createUserMessage: true })
  },
}
