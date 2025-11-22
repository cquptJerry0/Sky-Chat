/**
 * Chat Store - 中心化状态管理
 * 
 * 聊天相关状态的单一数据源
 * 使用 Zustand 实现轻量级、高性能的状态管理
 * 
 * 架构：
 * - State: 不可变数据（消息、配置、流式状态）
 * - Actions: 纯状态变更（无副作用）
 * - Selectors: 派生状态（计算值）
 * 
 * @module stores/chat
 */

import { create } from 'zustand'
import type { Message, AbortReason } from '@/features/chat/types/chat'
import { getDefaultModel, getModelById } from '@/features/chat/constants/models'
import { ConversationAPI } from '@/lib/services/conversation-api'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'
import { useConversationStore } from '@/features/conversation/store/conversation-store'

/**
 * 流式传输阶段指示器
 * - thinking: AI 正在生成推理内容
 * - answer: AI 正在生成最终回答
 * - null: 未在流式传输
 */
type StreamingPhase = 'thinking' | 'answer' | null

/**
 * 聊天状态接口
 */
interface ChatState {
  // ============ 核心状态 ============
  /** 消息历史 */
  messages: Message[]

  /** 消息发送加载状态 */
  isSendingMessage: boolean

  /** 当前选中的模型 ID */
  selectedModel: string

  /** 是否启用思考模式（支持的模型） */
  enableThinking: boolean

  /** 当前会话 ID（从 ConversationStore 同步） */
  currentConversationId: string | null

  // ============ 流式传输状态 ============
  /** 当前正在流式传输的消息 ID */
  streamingMessageId: string | null

  /** 当前流式传输阶段（thinking/answer） */
  streamingPhase: StreamingPhase

  /** 中断原因（用于标记消息被中断的原因） */
  abortReason: AbortReason | null
  
  // ============ 分页加载状态 ============
  /** 是否还有更早的消息 */
  hasOlderMessages: boolean
  
  /** 是否正在加载历史消息 */
  isLoadingOlder: boolean
  
  /** 最早消息的 ID（用作游标） */
  oldestMessageId: string | null
  
  /** 最新消息的 ID（用作游标） */
  newestMessageId: string | null
  
  // ============ 消息操作 ============
  /**
   * 添加新消息到历史记录
   */
  addMessage: (message: Message) => void
  
  /**
   * 根据 ID 更新现有消息
   */
  updateMessage: (id: string, updates: Partial<Message>) => void
  
  /**
   * 追加内容到 thinking 字段
   */
  appendThinking: (id: string, chunk: string) => void
  
  /**
   * 追加内容到 answer 字段
   */
  appendContent: (id: string, chunk: string) => void
  
  // ============ 流式传输控制 ============
  /**
   * 开始流式传输指定消息和阶段
   */
  startStreaming: (messageId: string, phase: StreamingPhase) => void
  
  /**
   * 停止所有流式传输活动
   * @param reason - 中断原因（可选）
   */
  stopStreaming: (reason?: AbortReason) => void
  
  // ============ 配置操作 ============
  /**
   * 设置活动模型
   */
  setModel: (modelId: string) => void

  /**
   * 切换思考模式
   */
  toggleThinking: (enabled: boolean) => void

  /**
   * 设置消息发送加载状态
   */
  setSendingMessage: (loading: boolean) => void

  /**
   * 设置当前会话ID（从 ConversationStore 同步）
   */
  setConversationId: (id: string | null) => void

  /**
   * 清空当前消息列表
   */
  clearMessages: () => void
  
  /**
   * 批量设置消息
   */
  setMessages: (messages: Message[]) => void

  /**
   * 发送消息（统一的发送方法）
   * @param content - 消息内容
   * @param options - 可选参数
   * @param options.createUserMessage - 是否创建 user 消息（默认 true）
   * @param options.attachments - 文件附件列表
   */
  sendMessage: (content: string, options?: {
    createUserMessage?: boolean
    attachments?: import('@/features/chat/types/chat').FileAttachment[]
  }) => Promise<void>

  /**
   * 重试失败的消息
   * 删除该消息及其之后的所有消息，然后重新发送用户输入
   */
  retryMessage: (messageId: string) => Promise<void>

  /**
   * 编辑用户消息并重新发送
   * 删除该消息之后的所有消息，更新该消息内容，然后重新发送
   */
  editAndResend: (messageId: string, newContent: string) => Promise<void>

  /**
   * 加载更早的消息（向上滚动加载历史）
   */
  loadOlderMessages: () => Promise<void>
  
  /**
   * 前置添加消息（用于分页加载）
   */
  prependMessages: (messages: Message[]) => void
  
  // ============ 工具方法 ============
  /**
   * 重置到初始状态（新对话）
   */
  reset: () => void
}

/**
 * 从 localStorage 读取上次选择的模型
 */
const getInitialModel = (): string => {
  if (typeof window === 'undefined') return getDefaultModel().id

  try {
    const savedModel = StorageManager.get<string>(STORAGE_KEYS.USER.SELECTED_MODEL)
    if (savedModel) {
      const model = getModelById(savedModel)
      if (model) {

        return savedModel
      }
    }
  } catch (error) {
    console.error('[ChatStore] Failed to load model from localStorage:', error)
  }

  return getDefaultModel().id
}

/**
 * 初始状态
 */
const initialState = {
  messages: [],
  isSendingMessage: false,
  selectedModel: getInitialModel(),
  enableThinking: false,
  currentConversationId: null,
  streamingMessageId: null,
  streamingPhase: null as StreamingPhase,
  abortReason: null as AbortReason | null,
  hasOlderMessages: true,
  isLoadingOlder: false,
  oldestMessageId: null,
  newestMessageId: null,
}

/**
 * Chat Store Hook
 * 
 * 使用方式:
 * ```tsx
 * const messages = useChatStore(s => s.messages)
 * const addMessage = useChatStore(s => s.addMessage)
 * ```
 */
export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,
  
  // ============ Message Actions ============
  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  
  updateMessage: (id: string, updates: Partial<Message>) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  
  appendThinking: (id: string, chunk: string) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, thinking: (m.thinking || '') + chunk } : m
      ),
    })),
  
  appendContent: (id: string, chunk: string) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: (m.content || '') + chunk } : m
      ),
    })),
  
  // ============ Streaming Control ============
  startStreaming: (messageId: string, phase: StreamingPhase) =>
    set({ 
      streamingMessageId: messageId, 
      streamingPhase: phase,
      abortReason: null, // 开始新的流式传输时清除之前的中断原因
    }),
  
  stopStreaming: (reason?: AbortReason) => {
    set({
      streamingMessageId: null,
      streamingPhase: null,
      abortReason: reason || null,
    })
  },
  
  // ============ Configuration Actions ============
  setModel: (modelId) => {
    try {
      StorageManager.set(STORAGE_KEYS.USER.SELECTED_MODEL, modelId)

    } catch (error) {
      console.error('[ChatStore] Failed to save model to localStorage:', error)
    }

    set({ selectedModel: modelId })
  },

  toggleThinking: (enabled) => set({ enableThinking: enabled }),

  setSendingMessage: (loading) => set({ isSendingMessage: loading }),

  // ============ Conversation Actions ============
  setConversationId: (id) => set({ currentConversationId: id }),
  
  clearMessages: () => set({ messages: [], hasOlderMessages: true, oldestMessageId: null, newestMessageId: null }),
  
  setMessages: (messages) => set({ 
    messages,
    oldestMessageId: messages[0]?.id || null,
    newestMessageId: messages[messages.length - 1]?.id || null,
  }),
  
  prependMessages: (newMessages) => set((state) => {
    if (newMessages.length === 0) return state
    
    return {
      messages: [...newMessages, ...state.messages],
      oldestMessageId: newMessages[0]?.id || state.oldestMessageId,
      hasOlderMessages: newMessages.length >= 30, // 如果加载的消息数 < 30，说明没有更多了
    }
  }),
  
  loadOlderMessages: async () => {
    const state = useChatStore.getState()
    
    // 防止重复加载
    if (!state.hasOlderMessages || state.isLoadingOlder || !state.currentConversationId) {
      return
    }
    
    set({ isLoadingOlder: true })
    
    try {
      const result = await ConversationAPI.getMessagesPaginated(
        state.currentConversationId,
        {
          cursor: state.oldestMessageId || undefined,
          direction: 'before',
          limit: 30,
        }
      )
      
      useChatStore.getState().prependMessages(result.messages as Message[])
      
      set({
        hasOlderMessages: result.hasMore,
        isLoadingOlder: false,
      })
    } catch (error) {
      console.error('Failed to load older messages:', error)
      set({ isLoadingOlder: false })
    }
  },
  
  // ============ 统一的消息发送方法 ============
  sendMessage: async (content, options = {}) => {
    const { createUserMessage = true, attachments } = options
    const state = useChatStore.getState()

    if (state.isSendingMessage) {
      return
    }

    const { nanoid } = await import('nanoid')

    const userMessageId = createUserMessage ? nanoid() : undefined
    const aiMessageId = nanoid()

    if (createUserMessage && userMessageId) {
      const userMsg: Message = {
        id: userMessageId,
        role: 'user',
        content,
        attachments,
      }
      state.addMessage(userMsg)
    }

    const aiMsg: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      thinking: '',
      displayState: 'waiting', // 初始状态为 waiting
    }
    state.addMessage(aiMsg)

    // 设置发送状态
    set({ isSendingMessage: true })

    try {
      // 从 ConversationStore 获取当前会话ID
      let conversationId = useConversationStore.getState().currentConversationId

      if (!conversationId) {
        const { conversation } = await ConversationAPI.create()
        conversationId = conversation.id

        // 设置到 ConversationStore（主导）
        useConversationStore.getState().setConversationId(conversationId)

        // 同步到 ChatStore
        set({ currentConversationId: conversationId })

        // 更新 URL
        if (typeof window !== 'undefined' && window.location.pathname === '/chat') {
          window.history.replaceState(null, '', `/chat/${conversationId}`)
        }

        // 添加到 ConversationStore
        useConversationStore.getState().addConversation(conversation)
      }

      // 调用 API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          conversationId,
          model: state.selectedModel,
          enableThinking: state.enableThinking,
          thinkingBudget: 4096,
          userMessageId,
          aiMessageId,
          attachments,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      // 使用 SSEParser 处理流
      const { SSEParser } = await import('@/lib/services/sse-parser')

      await SSEParser.parseStream(reader, {
        onData: (data) => {
          if (data.type === 'thinking' && data.content) {
            if (state.streamingPhase !== 'thinking') {
              state.startStreaming(aiMessageId, 'thinking')
              // 收到第一个 thinking，更新 displayState 为 streaming
              state.updateMessage(aiMessageId, { displayState: 'streaming' })
            }
            state.appendThinking(aiMessageId, data.content)
          } else if (data.type === 'answer' && data.content) {
            if (state.streamingPhase !== 'answer') {
              state.startStreaming(aiMessageId, 'answer')
              // 收到第一个 answer，更新 displayState 为 streaming
              state.updateMessage(aiMessageId, { displayState: 'streaming' })
            }
            state.appendContent(aiMessageId, data.content)
          } else if (data.type === 'complete') {
            state.stopStreaming()
            state.updateMessage(aiMessageId, { displayState: 'idle' })
            set({ isSendingMessage: false })
          }
        },
        onError: (error) => {
          console.error('SSE stream error:', error)
          state.updateMessage(aiMessageId, { hasError: true, displayState: 'error' })
          state.stopStreaming()
          set({ isSendingMessage: false })
        },
        onComplete: () => {
          state.stopStreaming()
          state.updateMessage(aiMessageId, { displayState: 'idle' })
          set({ isSendingMessage: false })
        },
      })
    } catch (error) {
      console.error('Send message error:', error)
      state.updateMessage(aiMessageId, { hasError: true })
      state.stopStreaming()
      set({ isSendingMessage: false })
    }
  },

  // 重试消息：删除失败的 AI 消息，重新发送（任何时候都可以重试，包括 thinking 中断）
  retryMessage: async (messageId) => {
    const state = useChatStore.getState()

    // 如果正在流式传输，先停止
    if (state.streamingMessageId) {
      state.stopStreaming('user_retry')
    }

    const messageIndex = state.messages.findIndex((m) => m.id === messageId)

    if (messageIndex === -1) return

    const message = state.messages[messageIndex]

    if (message.role === 'assistant') {
      // 获取要删除的消息（该消息及之后的所有消息）
      const messagesToDelete = state.messages.slice(messageIndex)
      const messageIdsToDelete = messagesToDelete.map((m) => m.id)

      // 删除该AI消息及其之后的所有消息
      const newMessages = state.messages.slice(0, messageIndex)

      // 找到最后一个用户消息
      const lastUserMessage = [...newMessages]
        .reverse()
        .find((m) => m.role === 'user')

      if (lastUserMessage) {
        // 更新消息列表
        set({ messages: newMessages })

        // 异步删除数据库中的消息（不阻塞发送）
        if (messageIdsToDelete.length > 0) {
          fetch('/api/messages/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds: messageIdsToDelete }),
          }).catch((error) => {
            console.error('Failed to delete messages from database:', error)
          })
        }

        // 重新发送（不创建 user 消息）
        state.sendMessage(lastUserMessage.content, { createUserMessage: false })
      }
    }
  },

  // 编辑并重发：删除旧消息，发送新消息
  editAndResend: async (messageId, newContent) => {
    const state = useChatStore.getState()
    const messageIndex = state.messages.findIndex((m) => m.id === messageId)

    if (messageIndex === -1) return

    const message = state.messages[messageIndex]
    if (message.role !== 'user') return

    // 获取要删除的消息（该消息及之后的所有消息）
    const messagesToDelete = state.messages.slice(messageIndex)
    const messageIdsToDelete = messagesToDelete.map((m) => m.id)

    // 先删除前端消息
    const messagesBefore = state.messages.slice(0, messageIndex)
    set({ messages: messagesBefore })

    // 异步删除数据库中的消息（不阻塞发送）
    if (messageIdsToDelete.length > 0) {
      fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: messageIdsToDelete }),
      }).catch((error) => {
        console.error('Failed to delete messages from database:', error)
      })
    }

    // 发送新消息（创建新的 user 消息）
    state.sendMessage(newContent, { createUserMessage: true })
  },
  
  // ============ Utility Actions ============
  reset: () => set(initialState),
}))

/**
 * Selectors - 派生状态
 * 使用这些 selector 获取计算值，防止不必要的重渲染
 */
export const selectIsStreaming = (state: ChatState) => 
  state.streamingMessageId !== null

export const selectStreamingMessage = (state: ChatState) =>
  state.messages.find((m) => m.id === state.streamingMessageId)

export const selectLastMessage = (state: ChatState) =>
  state.messages[state.messages.length - 1]

export const selectMessageCount = (state: ChatState) => state.messages.length
