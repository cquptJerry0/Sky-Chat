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
import { createMonitor, type Trace } from '@sky-monitor/sdk'
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
      const unique = messages.filter(
        (msg, i, arr) => arr.findIndex((m) => m.id === msg.id) === i
      ) as Message[]

      store.setMessages(unique)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      
      // 404 时跳转到首页
      if ((e as { status?: number }).status === 404) {
        console.warn('[ChatService] Conversation not found, redirecting to home')
        window.location.href = '/'
        return
      }
      
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

    // 设置监控上下文并创建 Trace
    monitor.setContext({ conversationId })
    const trace = monitor.createTrace({ aiMessageId })
    trace.start()

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

      await this.handleStream(reader, aiMessageId, trace)
    } catch (e) {
      // AbortError 是正常中断，不算错误
      if ((e as Error).name === 'AbortError') {
        store.updateMessage(aiMessageId, { displayState: 'idle' })
        trace.abort('user_manual')
        return
      }
      console.error('[ChatService] sendMessage failed:', e)
      store.updateMessage(aiMessageId, { hasError: true, displayState: 'error' })
      store.stopStreaming()
      trace.error((e as Error).message)
    } finally {
      streamAbortController = null
      store.setSendingMessage(false)
    }
  },

  /**
   * 处理 SSE 流
   * 使用 StreamBuffer 批量刷新，优化渲染性能
   * 使用消息状态机管理阶段转换
   */
  async handleStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    messageId: string,
    trace: Trace
  ): Promise<void> {
    let firstChunkReceived = false
    let completeTracked = false // 防止重复上报
    let currentPhase: 'thinking' | 'answer' | null = null

    // 后端 toolCallId → SDK toolCallId 映射
    const toolCallIdMap = new Map<string, string>()

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

    try {
      await SSEParser.parseStream(reader, {
        onData: (data) => {
          const s = useChatStore.getState()

          // 首个 chunk 到达，记录 TTFB
          if (!firstChunkReceived) {
            firstChunkReceived = true
            trace.firstChunk()
          }

          if (data.type === 'thinking' && data.content) {
            if (s.streamingPhase !== 'thinking') {
              // 阶段切换：开始 thinking
              if (currentPhase && currentPhase !== 'thinking') {
                trace.phaseEnd(currentPhase)
              }
              currentPhase = 'thinking'
              trace.phaseStart('thinking')
              s.startStreaming(messageId, 'thinking')
              s.transitionPhase(messageId, { type: 'START_THINKING' })
              s.updateMessage(messageId, { displayState: 'streaming' })
            }
            thinkingBuffer.append(data.content)
          } else if (data.type === 'answer' && data.content) {
            if (s.streamingPhase !== 'answer') {
              // 阶段切换：开始 answer
              if (currentPhase && currentPhase !== 'answer') {
                trace.phaseEnd(currentPhase)
              }
              currentPhase = 'answer'
              trace.phaseStart('answer')
              s.startStreaming(messageId, 'answer')
              s.transitionPhase(messageId, { type: 'START_ANSWERING' })
              s.updateMessage(messageId, { displayState: 'streaming' })
            }
            answerBuffer.append(data.content)
          } else if (data.type === 'tool_call') {
            // 工具调用开始
            const sdkToolCallId = trace.toolStart(data.name || 'unknown', {
              query: data.query,
              prompt: data.prompt,
            })
            // 保存后端 toolCallId → SDK toolCallId 映射
            if (data.toolCallId) {
              toolCallIdMap.set(data.toolCallId, sdkToolCallId)
            }
            
            // 状态机：转换到 tool_calling
            s.transitionPhase(messageId, {
              type: 'START_TOOL_CALL',
              toolCallId: data.toolCallId || sdkToolCallId,
              name: data.name || 'unknown',
              args: { query: data.query, prompt: data.prompt },
            })
            
            const msg = s.messages.find((m) => m.id === messageId)
            const invocations = msg?.toolInvocations || []
            const newInvocation = {
              toolCallId: data.toolCallId || sdkToolCallId,
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
            // 工具执行进度更新
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
            // 工具调用完成 - 用映射找到 SDK 的 toolCallId
            const sdkToolCallId = data.toolCallId
              ? toolCallIdMap.get(data.toolCallId)
              : undefined
            trace.toolEnd(data.name || 'unknown', {
              success: data.success ?? false,
              toolCallId: sdkToolCallId,
              imageUrl: data.imageUrl,
              width: data.width,
              height: data.height,
              resultCount: data.resultCount,
              sources: data.sources,
              error: data.success ? undefined : 'Tool failed',
            })

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

            // 结束当前阶段
            if (currentPhase) {
              trace.phaseEnd(currentPhase)
            }

            // 状态机：完成
            s.transitionPhase(messageId, { type: 'COMPLETE' })
            s.stopStreaming()
            s.updateMessage(messageId, { displayState: 'idle' })

            // 记录 TTLB（防止重复上报）
            if (!completeTracked) {
              completeTracked = true
              trace.complete()
            }
          }
        },
        onError: (error) => {
          console.error('[ChatService] stream error:', error)
          thinkingBuffer.forceFlush()
          answerBuffer.forceFlush()
          if (currentPhase) {
            trace.phaseEnd(currentPhase)
          }
          trace.error(error.message)
          const s = useChatStore.getState()
          s.transitionPhase(messageId, { type: 'ERROR', message: error.message })
          s.updateMessage(messageId, { hasError: true, displayState: 'error' })
          s.stopStreaming()
        },
        onComplete: () => {
          thinkingBuffer.forceFlush()
          answerBuffer.forceFlush()
          const s = useChatStore.getState()
          s.stopStreaming()
          s.updateMessage(messageId, { displayState: 'idle' })
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

    // 重新发送
    await this.sendMessage(conversationId, lastUserMsg.content, { createUserMessage: false })
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
