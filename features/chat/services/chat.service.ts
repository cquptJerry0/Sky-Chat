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
import { StreamBuffer } from '@/features/chat/utils/stream-buffer'
import { createMonitor } from '@sky-monitor/sdk'
import type { Message, FileAttachment } from '@/features/chat/types/chat'

// 初始化监控实例
const monitor = createMonitor({ appId: 'sky-chat', debug: true })

// 用于取消请求
let loadAbortController: AbortController | null = null
let streamAbortController: AbortController | null = null

export const ChatService = {
  /**
   * 中断当前流式请求
   */
  abortStream(): void {
    if (streamAbortController) {
      streamAbortController.abort()
      streamAbortController = null
    }
  },

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
    options: {
      createUserMessage?: boolean
      attachments?: FileAttachment[]
      enableImageGeneration?: boolean
      imageConfig?: { prompt: string; negative_prompt?: string; image_size: string }
    } = {}
  ): Promise<void> {
    const { createUserMessage = true, attachments, enableImageGeneration, imageConfig } = options
    const store = useChatStore.getState()
    
    if (store.isSendingMessage) return
    store.setSendingMessage(true)
    
    const userMessageId = createUserMessage ? nanoid() : undefined
    const aiMessageId = nanoid()
    const traceId = nanoid() // 用于追踪本次请求
    const startTime = Date.now()
    
    // 设置监控上下文
    monitor.setContext({ conversationId })
    monitor.track('sse_start', { traceId, aiMessageId })
    
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
      // 创建 AbortController 用于中断
      streamAbortController = new AbortController()
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          conversationId,
          model: store.selectedModel,
          enableThinking: store.enableThinking,
          enableWebSearch: store.enableWebSearch,
          enableImageGeneration,
          imageConfig,
          thinkingBudget: 4096,
          userMessageId,
          aiMessageId,
          attachments,
        }),
        signal: streamAbortController.signal,
      })
      
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      
      await this.handleStream(reader, aiMessageId, { traceId, startTime })
    } catch (e) {
      // AbortError 是正常中断，不算错误
      if ((e as Error).name === 'AbortError') {
        store.updateMessage(aiMessageId, { displayState: 'idle' })
        monitor.track('sse_abort', { traceId, duration: Date.now() - startTime })
        return
      }
      console.error('[ChatService] sendMessage failed:', e)
      store.updateMessage(aiMessageId, { hasError: true, displayState: 'error' })
      store.stopStreaming()
      monitor.track('sse_error', { 
        traceId, 
        error: (e as Error).message,
        duration: Date.now() - startTime 
      })
    } finally {
      streamAbortController = null
      store.setSendingMessage(false)
    }
  },

  /**
   * 处理 SSE 流
   * 使用 StreamBuffer 批量刷新，优化渲染性能
   */
  async handleStream(
    reader: ReadableStreamDefaultReader<Uint8Array>, 
    messageId: string,
    metrics?: { traceId: string; startTime: number }
  ): Promise<void> {
    let firstChunkReceived = false
    let completeTracked = false // 防止重复上报
    
    // 创建两个独立的 buffer：thinking 和 answer
    const thinkingBuffer = new StreamBuffer({
      onFlush: (content) => useChatStore.getState().appendThinking(messageId, content)
    })
    
    const answerBuffer = new StreamBuffer({
      onFlush: (content) => useChatStore.getState().appendContent(messageId, content)
    })

    try {
      await SSEParser.parseStream(reader, {
        onData: (data) => {
          const s = useChatStore.getState()
          
          // 首个 chunk 到达，记录 TTFB
          if (!firstChunkReceived && metrics) {
            firstChunkReceived = true
            const ttfb = Date.now() - metrics.startTime
            monitor.track('sse_first_chunk', { traceId: metrics.traceId, ttfb })
          }
          
          if (data.type === 'thinking' && data.content) {
            if (s.streamingPhase !== 'thinking') {
              s.startStreaming(messageId, 'thinking')
              s.updateMessage(messageId, { displayState: 'streaming' })
            }
            thinkingBuffer.append(data.content) // 使用 buffer 而非直接 setState
          } else if (data.type === 'answer' && data.content) {
            if (s.streamingPhase !== 'answer') {
              s.startStreaming(messageId, 'answer')
              s.updateMessage(messageId, { displayState: 'streaming' })
            }
            answerBuffer.append(data.content) // 使用 buffer 而非直接 setState
          } else if (data.type === 'tool_call') {
            // 工具调用开始 - 添加新的 invocation（不经过 buffer）
            const msg = s.messages.find((m) => m.id === messageId)
            const invocations = msg?.toolInvocations || []
            const newInvocation = {
              toolCallId: data.toolCallId || `temp_${Date.now()}`,
              name: data.name || 'unknown',
              state: 'running' as const,
              args: {
                query: data.query,
                prompt: data.prompt,
              },
            }
            s.updateMessage(messageId, {
              toolInvocations: [...invocations, newInvocation],
              displayState: 'streaming',
            })
          } else if (data.type === 'tool_result') {
            // 工具调用完成 - 通过 toolCallId 精确匹配
            const msg = s.messages.find((m) => m.id === messageId)
            const invocations = msg?.toolInvocations || []
            const updatedInvocations = invocations.map((inv) => {
              // 优先用 toolCallId 匹配，fallback 到 name + running 状态
              const isMatch = data.toolCallId
                ? inv.toolCallId === data.toolCallId
                : inv.name === data.name && inv.state === 'running'
              if (isMatch) {
                return {
                  ...inv,
                  state: data.success ? ('completed' as const) : ('failed' as const),
                  result: {
                    success: data.success ?? false,
                    imageUrl: data.imageUrl,
                    resultCount: data.resultCount,
                    sources: data.sources,
                    width: data.width,
                    height: data.height,
                  },
                }
              }
              return inv
            })
            
            // 图片生成完成时，直接插入图片到 content 流的当前位置
            if (data.name === 'generate_image' && data.success && data.imageUrl) {
              const imageData = JSON.stringify({
                url: data.imageUrl,
                alt: invocations.find(inv => inv.toolCallId === data.toolCallId)?.args?.prompt || '生成的图片',
                width: data.width || 512,
                height: data.height || 512,
              })
              // 插入 image 代码块到 content（通过 buffer）
              answerBuffer.append(`\n\`\`\`image\n${imageData}\n\`\`\`\n`)
            }
            
            s.updateMessage(messageId, {
              toolInvocations: updatedInvocations,
            })
          } else if (data.type === 'complete') {
            // 流结束前强制刷新 buffer
            thinkingBuffer.forceFlush()
            answerBuffer.forceFlush()
            s.stopStreaming()
            s.updateMessage(messageId, { displayState: 'idle' })
            
            // 记录 TTLB（防止重复上报）
            if (metrics && !completeTracked) {
              completeTracked = true
              const ttlb = Date.now() - metrics.startTime
              monitor.track('sse_complete', { traceId: metrics.traceId, ttlb })
            }
          }
        },
        onError: (error) => {
          console.error('[ChatService] stream error:', error)
          // 错误时也要刷新 buffer
          thinkingBuffer.forceFlush()
          answerBuffer.forceFlush()
          const s = useChatStore.getState()
          s.updateMessage(messageId, { hasError: true, displayState: 'error' })
          s.stopStreaming()
        },
        onComplete: () => {
          // 完成时强制刷新 buffer
          thinkingBuffer.forceFlush()
          answerBuffer.forceFlush()
          const s = useChatStore.getState()
          s.stopStreaming()
          s.updateMessage(messageId, { displayState: 'idle' })
        },
      })
    } finally {
      // 清理资源
      thinkingBuffer.destroy()
      answerBuffer.destroy()
    }
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
