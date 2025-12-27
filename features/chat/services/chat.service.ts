/**
 * Chat Service - 业务逻辑
 *
 * 处理消息发送、加载、流式解析等
 * 不依赖 React，纯业务逻辑
 */

import { nanoid } from 'nanoid'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ConversationAPI } from '@/features/chat/services/conversation-api'
import { SSEParser } from '@/features/chat/utils/sse-parser'
import { StreamBuffer } from '@/features/chat/utils/stream-buffer'
import type { Message, FileAttachment } from '@/features/chat/types/chat'
import {
  startTrace,
  endTrace,
  getCurrentTraceId,
  recordFirstChunk,
  recordChunk,
  startPhase,
  endPhase,
  startToolWithId,
  endTool,
} from '@/lib/monitor/trace-helper'

// 用于取消请求
let loadAbortController: AbortController | null = null
let streamAbortController: AbortController | null = null

export const ChatService = {
  /**
   * 中断当前流式请求
   */
  abortStream(): void {
    // ========== 埋点：先结束 Trace ==========
    endTrace('abort', 'user_cancel')

    if (streamAbortController) {
      streamAbortController.abort()
      streamAbortController = null
    }
    
    // 更新状态机：将当前流式消息的状态转为 idle
    const store = useChatStore.getState()
    const messageId = store.streamingMessageId
    if (messageId) {
      // 取消所有正在运行的工具
      const messageState = store.messageStates.get(messageId)
      if (messageState) {
        for (const [toolCallId, tool] of messageState.activeTools) {
          if (tool.state === 'running') {
            store.cancelTool(messageId, toolCallId)
            // 通知后端取消工具
            fetch('/api/chat/cancel-tool', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ toolCallId }),
            }).catch(() => {})
          }
        }
      }
      
      // 状态机转到 idle
      store.transitionPhase(messageId, { type: 'COMPLETE' })
      store.updateMessage(messageId, { displayState: 'idle' })
      
      // 保存已接收的内容到数据库
      const message = store.messages.find((m) => m.id === messageId)
      if (message) {
        fetch(`/api/message/${messageId}/save-partial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message.content || '',
            thinking: message.thinking || '',
            toolInvocations: message.toolInvocations || [],
          }),
        }).catch((e) => console.error('[ChatService] Failed to save partial message:', e))
      }
    }
  },

  /**
   * 取消指定工具的执行
   * @param abortStream - 是否同时中断整个流（默认 false）
   */
  async cancelTool(messageId: string, toolCallId: string, abortStream = false): Promise<boolean> {
    try {
      const response = await fetch('/api/chat/cancel-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolCallId }),
      })
      const data = await response.json()
      
      if (data.success) {
        const store = useChatStore.getState()
        store.cancelTool(messageId, toolCallId)
        
        // 如果需要中断整个流
        if (abortStream) {
          this.abortStream()
        }
      }
      
      return data.success
    } catch (e) {
      console.error('[ChatService] cancelTool failed:', e)
      return false
    }
  },

  /**
   * 加载会话消息（带缓存，智能 loading）
   * - 第一次进入会话：显示 loading
   * - 切换会话：从缓存立即显示，后台静默加载
   */
  async loadMessages(conversationId: string): Promise<void> {
    const store = useChatStore.getState()

    // 如果正在发送消息，不要加载（避免覆盖刚添加的消息）
    if (store.isSendingMessage) {
      console.log('[ChatService] Skipping loadMessages - sending in progress')
      return
    }

    // 如果正在流式生成，先中断并保存已生成的内容
    if (store.streamingMessageId) {
      this.abortStream()
    }

    // 取消之前的请求
    loadAbortController?.abort()
    loadAbortController = new AbortController()

    // 检查是否有缓存
    const cached = store.getCachedMessages(conversationId)
    const hasCache = cached && cached.length > 0

    // 如果没有缓存，显示 loading；有缓存则立即显示
    if (!hasCache) {
      store.setLoadingMessages(true, conversationId)
    } else {
      store.setMessages(cached)
    }

    // 后台加载最新数据
    try {
      const { messages } = await ConversationAPI.getMessages(conversationId)

      // 去重
      const unique = messages.filter(
        (msg, i, arr) => arr.findIndex((m) => m.id === msg.id) === i
      ) as Message[]

      // 更新缓存和显示
      store.cacheMessages(conversationId, unique)
      store.setMessages(unique)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      
      // 404 时跳转到首页
      if ((e as { status?: number }).status === 404) {
        console.warn('[ChatService] Conversation not found, redirecting to home')
        window.location.href = '/'
        return
      }
      
      // 静默失败，保持缓存数据
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
      previousTraceId?: string
    } = {}
  ): Promise<void> {
    const { createUserMessage = true, attachments, enableImageGeneration, imageConfig, previousTraceId } = options
    const store = useChatStore.getState()

    console.log('[ChatService] sendMessage called:', { content, conversationId, isSendingMessage: store.isSendingMessage })

    if (store.isSendingMessage) {
      console.log('[ChatService] Already sending, skipping')
      return
    }
    store.setSendingMessage(true)

    const userMessageId = createUserMessage ? nanoid() : undefined
    const aiMessageId = nanoid()

    // ========== 埋点：创建并启动 Trace ==========
    startTrace(aiMessageId, previousTraceId)

    // 添加用户消息
    if (createUserMessage && userMessageId) {
      console.log('[ChatService] Adding user message:', userMessageId)
      store.addMessage({
        id: userMessageId,
        role: 'user',
        content,
        attachments,
      })
    }

    // 添加 AI 占位消息
    console.log('[ChatService] Adding AI message:', aiMessageId)
    store.addMessage({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      thinking: '',
      displayState: 'waiting',
    })
    
    console.log('[ChatService] Messages after add:', useChatStore.getState().messages.length)

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

      // 读取响应头中的标题更新，立即同步到前端 store
      const newTitle = response.headers.get('X-Conversation-Title')
      if (newTitle) {
        const decodedTitle = decodeURIComponent(newTitle)
        // 动态导入避免循环依赖
        const { useConversationStore } = await import('@/features/conversation/store/conversation-store')
        // 直接更新本地 store（不调用 API，因为后端已经更新了）
        useConversationStore.setState((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, title: decodedTitle } : c
          ),
          filteredConversations: state.filteredConversations.map((c) =>
            c.id === conversationId ? { ...c, title: decodedTitle } : c
          ),
        }))
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      await this.handleStream(reader, aiMessageId)
    } catch (e) {
      // AbortError 是正常中断，不算错误
      if ((e as Error).name === 'AbortError') {
        store.updateMessage(aiMessageId, { displayState: 'idle' })
        // 注意：AbortError 不在这里埋点，因为 abortStream() 已经埋点了
        return
      }
      console.error('[ChatService] sendMessage failed:', e)
      store.updateMessage(aiMessageId, { hasError: true, displayState: 'error' })
      store.stopStreaming()
      // ========== 埋点：错误结束 ==========
      endTrace('error', (e as Error).message)
    } finally {
      streamAbortController = null
      store.setSendingMessage(false)
      // 更新消息缓存
      const currentMessages = useChatStore.getState().messages
      useChatStore.getState().cacheMessages(conversationId, currentMessages)
    }
  },

  /**
   * 处理 SSE 流
   * 使用 StreamBuffer 批量刷新，优化渲染性能
   * 使用消息状态机管理阶段转换
   */
  async handleStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    messageId: string
  ): Promise<void> {
    // 初始化消息状态机
    const store = useChatStore.getState()
    store.initMessageState(messageId)

    // 创建两个独立的 buffer：thinking 和 answer
    const thinkingBuffer = new StreamBuffer({
      onFlush: (content) => useChatStore.getState().appendThinking(messageId, content),
    })

    const answerBuffer = new StreamBuffer({
      onFlush: (content) => useChatStore.getState().appendContent(messageId, content),
    })

    // ========== 埋点状态 ==========
    let isFirstChunk = true
    let currentPhase: 'thinking' | 'answer' | null = null
    let traceEnded = false

    try {
      await SSEParser.parseStream(reader, {
        onData: (data) => {
          const s = useChatStore.getState()

          // ========== 埋点：首个 chunk ==========
          if (isFirstChunk) {
            recordFirstChunk()
            isFirstChunk = false
          }

          // ========== 埋点：每个 chunk（stall 检测） ==========
          recordChunk()

          if (data.type === 'thinking' && data.content) {
            if (s.streamingPhase !== 'thinking') {
              s.startStreaming(messageId, 'thinking')
              s.transitionPhase(messageId, { type: 'START_THINKING' })
              s.updateMessage(messageId, { displayState: 'streaming' })
              // ========== 埋点：阶段切换 ==========
              if (currentPhase && currentPhase !== 'thinking') {
                endPhase(currentPhase)
              }
              startPhase('thinking')
              currentPhase = 'thinking'
            }
            thinkingBuffer.append(data.content)
          } else if (data.type === 'answer' && data.content) {
            if (s.streamingPhase !== 'answer') {
              s.startStreaming(messageId, 'answer')
              s.transitionPhase(messageId, { type: 'START_ANSWERING' })
              s.updateMessage(messageId, { displayState: 'streaming' })
              // ========== 埋点：阶段切换 ==========
              if (currentPhase && currentPhase !== 'answer') {
                endPhase(currentPhase)
              }
              startPhase('answer')
              currentPhase = 'answer'
            }
            answerBuffer.append(data.content)
          } else if (data.type === 'tool_call') {
            // 工具调用开始
            const toolCallId = data.toolCallId || nanoid()
            
            // 状态机：转换到 tool_calling
            s.transitionPhase(messageId, {
              type: 'START_TOOL_CALL',
              toolCallId,
              name: data.name || 'unknown',
              args: { query: data.query, prompt: data.prompt },
            })

            // ========== 埋点：工具开始 ==========
            startToolWithId(toolCallId, data.name || 'unknown', {
              query: data.query,
              prompt: data.prompt,
            })
            
            const msg = s.messages.find((m) => m.id === messageId)
            const invocations = msg?.toolInvocations || []
            const newInvocation = {
              toolCallId,
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
          } else if (data.type === 'tool_progress') {
            // 工具执行进度更新（不埋点，太频繁）
            if (data.toolCallId && data.progress !== undefined) {
              s.transitionPhase(messageId, {
                type: 'TOOL_PROGRESS',
                toolCallId: data.toolCallId,
                progress: data.progress,
                estimatedTime: data.estimatedTime,
              })
              s.updateToolProgress(messageId, data.toolCallId, data.progress, data.estimatedTime)
            }
          } else if (data.type === 'tool_result') {
            // 状态机：工具完成
            s.transitionPhase(messageId, {
              type: 'TOOL_COMPLETE',
              toolCallId: data.toolCallId || '',
              success: data.success ?? false,
              result: {
                imageUrl: data.imageUrl,
                resultCount: data.resultCount,
                sources: data.sources,
              },
            })

            // ========== 埋点：工具结束 ==========
            endTool(data.name || 'unknown', {
              toolCallId: data.toolCallId,
              success: data.success ?? false,
              imageUrl: data.imageUrl,
              width: data.width,
              height: data.height,
              resultCount: data.resultCount,
              sources: data.sources,
            })

            const msg = s.messages.find((m) => m.id === messageId)
            const invocations = msg?.toolInvocations || []
            const updatedInvocations = invocations.map((inv) => {
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

            // 图片生成完成时，直接插入图片到 content 流
            if (data.name === 'generate_image' && data.success && data.imageUrl) {
              const imageData = JSON.stringify({
                url: data.imageUrl,
                alt:
                  invocations.find((inv) => inv.toolCallId === data.toolCallId)?.args?.prompt ||
                  '生成的图片',
                width: data.width || 512,
                height: data.height || 512,
              })
              answerBuffer.append(`\n\`\`\`image\n${imageData}\n\`\`\`\n`)
            }

            s.updateMessage(messageId, {
              toolInvocations: updatedInvocations,
            })
          } else if (data.type === 'complete') {
            // 流结束前强制刷新 buffer
            thinkingBuffer.forceFlush()
            answerBuffer.forceFlush()

            // 状态机：完成
            s.transitionPhase(messageId, { type: 'COMPLETE' })
            s.stopStreaming()
            s.updateMessage(messageId, { displayState: 'idle' })

            // ========== 埋点：完成 ==========
            if (currentPhase) endPhase(currentPhase)
            endTrace('complete')
            traceEnded = true
          }
        },
        onError: (error) => {
          console.error('[ChatService] stream error:', error)
          thinkingBuffer.forceFlush()
          answerBuffer.forceFlush()
          const s = useChatStore.getState()
          s.transitionPhase(messageId, { type: 'ERROR', message: error.message })
          s.updateMessage(messageId, { hasError: true, displayState: 'error' })
          s.stopStreaming()
          // ========== 埋点：错误 ==========
          if (currentPhase) endPhase(currentPhase)
          endTrace('error', error.message)
          traceEnded = true
        },
        onComplete: () => {
          thinkingBuffer.forceFlush()
          answerBuffer.forceFlush()
          const s = useChatStore.getState()
          s.stopStreaming()
          s.updateMessage(messageId, { displayState: 'idle' })
          // ========== 埋点：完成（如果还没结束） ==========
          if (!traceEnded) {
            if (currentPhase) endPhase(currentPhase)
            endTrace('complete')
          }
        },
      })
    } finally {
      thinkingBuffer.destroy()
      answerBuffer.destroy()
    }
  },

  /**
   * 重试消息
   */
  async retryMessage(conversationId: string, messageId: string): Promise<void> {
    const store = useChatStore.getState()

    // ========== 埋点：获取当前 Trace ID ==========
    const previousTraceId = getCurrentTraceId()

    if (store.streamingMessageId) {
      store.stopStreaming('user_retry')
    }

    const index = store.messages.findIndex((m) => m.id === messageId)
    if (index === -1) return

    const message = store.messages[index]
    if (message.role !== 'assistant') return

    // 删除从该消息开始的所有消息
    const removed = store.removeMessagesFrom(index)
    const idsToDelete = removed.map((m) => m.id)

    // 找到最后一条用户消息
    const lastUserMsg = [...store.messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    // 后台删除数据库记录
    if (idsToDelete.length > 0) {
      fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: idsToDelete }),
      }).catch(console.error)
    }

    // ========== 埋点：传入 previousTraceId ==========
    await this.sendMessage(conversationId, lastUserMsg.content, { 
      createUserMessage: false,
      previousTraceId,
    })
  },

  /**
   * 编辑并重发
   */
  async editAndResend(
    conversationId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    const store = useChatStore.getState()
    const index = store.messages.findIndex((m) => m.id === messageId)

    if (index === -1) return
    if (store.messages[index].role !== 'user') return

    // 删除从该消息开始的所有消息
    const removed = store.removeMessagesFrom(index)
    const idsToDelete = removed.map((m) => m.id)

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
