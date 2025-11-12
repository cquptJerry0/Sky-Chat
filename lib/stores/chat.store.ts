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
import type { Message, AbortReason } from '@/lib/types/chat'
import { getDefaultModel, getModelById } from '@/lib/constants/models'
import {
  ConversationAPI,
  type Conversation,
} from '@/lib/services/conversation-api'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'

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
  
  /** 全局加载状态 */
  isLoading: boolean
  
  /** 当前选中的模型 ID */
  selectedModel: string
  
  /** 是否启用思考模式（支持的模型） */
  enableThinking: boolean
  
  // ============ 会话管理 ============
  /** 当前会话 ID */
  currentConversationId: string | null
  
  /** 会话列表 */
  conversations: Conversation[]
  
  /** 过滤后的会话列表（用于搜索） */
  filteredConversations: Conversation[]
  
  /** 会话列表加载状态 */
  conversationsLoading: boolean
  
  // ============ 流式传输状态 ============
  /** 当前正在流式传输的消息 ID */
  streamingMessageId: string | null
  
  /** 当前流式传输阶段（thinking/answer） */
  streamingPhase: StreamingPhase
  
  /** 续传请求的AbortController */
  continueAbortController: AbortController | null

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
   * 设置全局加载状态
   */
  setLoading: (loading: boolean) => void
  
  // ============ 会话管理操作 ============
  /**
   * 设置当前会话ID
   */
  setConversationId: (id: string | null) => void
  
  /**
   * 加载会话列表
   */
  loadConversations: () => Promise<void>
  
  /**
   * 设置过滤后的会话列表（用于搜索）
   */
  setFilteredConversations: (conversations: Conversation[]) => void
  
  /**
   * 创建新会话并切换
   */
  createNewConversation: () => Promise<void>
  
  /**
   * 切换到指定会话（加载消息）
   */
  switchConversation: (id: string) => Promise<void>
  
  /**
   * 删除会话
   */
  deleteConversation: (id: string) => Promise<void>
  
  /**
   * 更新会话标题
   */
  updateConversationTitle: (id: string, title: string) => Promise<void>
  
  /**
   * 清空当前消息列表
   */
  clearMessages: () => void
  
  /**
   * 批量设置消息
   */
  setMessages: (messages: Message[]) => void
  
  /**
   * 重试失败的消息
   * 删除该消息及其之后的所有消息，然后重新发送用户输入
   */
  retryMessage: (messageId: string) => void
  
  /**
   * 编辑用户消息并重新发送
   * 删除该消息之后的所有消息，更新该消息内容，然后重新发送
   */
  editAndResend: (messageId: string, newContent: string) => void
  
  /**
   * 继续生成（断点续传）
   * 让AI继续生成当前消息的后续内容
   */
  continueGeneration: (messageId: string) => Promise<void>
  
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
        console.log('[ChatStore] Restored model from localStorage:', savedModel)
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
  isLoading: false,
  selectedModel: getInitialModel(),
  enableThinking: false,
  currentConversationId: null,
  conversations: [],
  filteredConversations: [],
  conversationsLoading: false,
  streamingMessageId: null,
  streamingPhase: null as StreamingPhase,
  continueAbortController: null,
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
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  
  appendThinking: (id, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, thinking: (m.thinking || '') + chunk } : m
      ),
    })),
  
  appendContent: (id, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: (m.content || '') + chunk } : m
      ),
    })),
  
  // ============ Streaming Control ============
  startStreaming: (messageId, phase) =>
    set({ 
      streamingMessageId: messageId, 
      streamingPhase: phase,
      abortReason: null, // 开始新的流式传输时清除之前的中断原因
    }),
  
  stopStreaming: (reason) => {
    // 中止续传请求（如果存在）
    const state = useChatStore.getState()
    if (state.continueAbortController) {
      state.continueAbortController.abort(
        new DOMException('Generation stopped', 'AbortError')
      )
    }

    // 如果提供了中断原因，标记当前streaming的消息
    if (reason && state.streamingMessageId) {
      const shouldPause = reason !== 'user_stop' // 主动停止不需要暂停标记
      state.updateMessage(state.streamingMessageId, {
        isPaused: shouldPause,
        pauseReason: reason,
        canContinue: shouldPause, // 非主动停止的都可以续传
      })
    }
    
    set({ 
      streamingMessageId: null, 
      streamingPhase: null,
      continueAbortController: null, // 清理引用
      abortReason: reason || null,
    })
  },
  
  // ============ Configuration Actions ============
  setModel: (modelId) => {
    try {
      StorageManager.set(STORAGE_KEYS.USER.SELECTED_MODEL, modelId)
      console.log('[ChatStore] Saved model to localStorage:', modelId)
    } catch (error) {
      console.error('[ChatStore] Failed to save model to localStorage:', error)
    }

    set({ selectedModel: modelId })
  },
  
  toggleThinking: (enabled) => set({ enableThinking: enabled }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  // ============ Conversation Actions ============
  setConversationId: (id) => set({ currentConversationId: id }),
  
  loadConversations: async () => {
    set({ conversationsLoading: true })
    try {
      const { conversations } = await ConversationAPI.list()
      console.log(
        `[ChatStore] Loaded ${conversations.length} conversations for current user`
      )

      // 安全检查：确保所有会话都有 userId（开发环境下）
      if (process.env.NODE_ENV === 'development') {
        const invalidConversations = conversations.filter((c) => !c.userId)
        if (invalidConversations.length > 0) {
          console.warn(
            '[ChatStore] Found conversations without userId:',
            invalidConversations
          )
        }
      }

      set({
        conversations,
        filteredConversations: conversations,
        conversationsLoading: false,
      })
    } catch (error) {
      // 静默处理未登录错误（401），避免控制台报错
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (
        !errorMessage.includes('Unauthorized') &&
        !errorMessage.includes('401')
      ) {
        console.error('Failed to load conversations:', error)
      }
      set({
        conversationsLoading: false,
        conversations: [],
        filteredConversations: [],
      })
    }
  },
  
  setFilteredConversations: (conversations: Conversation[]) =>
    set({ filteredConversations: conversations }),
  
  createNewConversation: async () => {
    try {
      const { conversation } = await ConversationAPI.create()
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        filteredConversations: [conversation, ...state.filteredConversations],
        currentConversationId: conversation.id,
        messages: [],
      }))
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  },
  
  switchConversation: async (id) => {
    set({ isLoading: true })
    try {
      const { messages } = await ConversationAPI.getMessages(id)
      set({
        currentConversationId: id,
        messages: messages as Message[],
        isLoading: false,
        hasOlderMessages: messages.length >= 50,
        oldestMessageId: messages[0]?.id || null,
        newestMessageId: messages[messages.length - 1]?.id || null,
      })
    } catch (error) {
      console.error('Failed to switch conversation:', error)
      
      // 更详细的错误处理
      if (error instanceof Error) {
        console.error('Error details:', error.message)
      }
      
      set({ isLoading: false, messages: [] })
      
      // 抛出错误让上层处理（比如重定向）
      throw error
    }
  },
  
  deleteConversation: async (id) => {
    try {
      // 先调用 API 删除
      const result = await ConversationAPI.delete(id)
      
      // 验证删除成功
      if (!result.success) {
        console.error('Delete failed: API returned unsuccessful')
        throw new Error('Delete operation failed')
      }
      
      // 只有确认删除成功才更新本地状态
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        filteredConversations: state.filteredConversations.filter(
          (c) => c.id !== id
        ),
        // 如果删除的是当前会话，清空
        currentConversationId:
          state.currentConversationId === id
            ? null
            : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
      }))
      
      console.log(`[ChatStore] Conversation deleted successfully: ${id}`)
      
      // 可选：验证删除（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        // 延迟检查，确保数据库事务完成
        setTimeout(async () => {
          try {
            const { conversations } = await ConversationAPI.list()
            const stillExists = conversations.find((c) => c.id === id)
            if (stillExists) {
              console.error('[ChatStore] WARNING: Conversation still exists after delete!', id)
              // 重新加载以保持一致性
              const state = useChatStore.getState()
              state.loadConversations()
            }
          } catch (error) {
            // 忽略验证错误
            console.log('[ChatStore] Could not verify deletion:', error)
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      // 删除失败时不更新本地状态，保持数据一致性
      
      // 可选：重新加载会话列表以确保状态一致
      // const state = useChatStore.getState()
      // state.loadConversations()
    }
  },
  
  updateConversationTitle: async (id, title) => {
    try {
      await ConversationAPI.updateTitle(id, title)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
        filteredConversations: state.filteredConversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      }))
    } catch (error) {
      console.error('Failed to update conversation title:', error)
    }
  },
  
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
  
  retryMessage: (messageId) =>
    set((state) => {
      // 找到该消息的索引
      const messageIndex = state.messages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) return state
      
      // 找到该消息及其对应的用户消息
      const message = state.messages[messageIndex]
      
      // 如果是AI消息，找到前一个用户消息
      if (message.role === 'assistant') {
        // 删除该AI消息及其之后的所有消息
        const newMessages = state.messages.slice(0, messageIndex)
        
        // 找到最后一个用户消息
        const lastUserMessage = [...newMessages]
          .reverse()
          .find((m) => m.role === 'user')
        
        if (lastUserMessage) {
          // 触发重新生成（通过自定义事件）
          // 注意：这个事件会在use-chat-input.ts中被监听
          window.dispatchEvent(
            new CustomEvent('retry-message', {
              detail: { content: lastUserMessage.content },
            })
          )
          
          return { messages: newMessages }
        }
      }
      
      return state
    }),
  
  editAndResend: (messageId, newContent) =>
    set((state) => {
      // 找到该消息
      const message = state.messages.find((m) => m.id === messageId)
      if (!message || message.role !== 'user') return state
      
      // ✅ 保留所有历史消息，在末尾追加新的用户消息
      const newUserMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: newContent,
      }
      
      // 触发重新生成（通过自定义事件）
      window.dispatchEvent(
        new CustomEvent('edit-and-resend', {
          detail: { content: newContent },
        })
      )
      
      return { 
        messages: [...state.messages, newUserMessage],
        newestMessageId: newUserMessage.id,
      }
    }),
  
  continueGeneration: async (messageId) => {
    const state = useChatStore.getState()
    const message = state.messages.find((m) => m.id === messageId)
    
    if (!message || message.role !== 'assistant') {
      return
    }
    
    const conversationId = state.currentConversationId
    if (!conversationId) {
      return
    }
    
    // 创建AbortController用于中断续传
    const abortController = new AbortController()
    set({ continueAbortController: abortController })
    
    // 开始流式传输
    state.startStreaming(messageId, 'answer')
    state.setLoading(true)
    
    try {
      const response = await fetch('/api/chat/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, conversationId }),
        signal: abortController.signal,
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }
      
      // 使用 SSEParser 处理流
      const { SSEParser } = await import('@/lib/services/sse-parser')
      SSEParser.parseStream(reader).subscribe({
        next: (data) => {
          if (data.type === 'thinking' && data.content) {
            // 处理thinking内容
            if (state.streamingPhase !== 'thinking') {
              state.startStreaming(messageId, 'thinking')
            }
            state.appendThinking(messageId, data.content)
          } else if (data.type === 'answer' && data.content) {
            // 处理answer内容
            if (state.streamingPhase !== 'answer') {
              state.startStreaming(messageId, 'answer')
            }
            state.appendContent(messageId, data.content)
          } else if (data.type === 'complete') {
            state.stopStreaming()
            state.setLoading(false)
          }
        },
        error: (error) => {
          // AbortError 是正常中断，不需要特殊处理
          if (error.name === 'AbortError') {
            console.log('[Continue] Stream aborted by user')
          } else {
            console.error('Continue generation error:', error)
            state.updateMessage(messageId, { hasError: true })
          }
          state.stopStreaming()
          state.setLoading(false)
        },
        complete: () => {
          state.stopStreaming()
          state.setLoading(false)
        },
      })
    } catch (error) {
      // 忽略AbortError（用户主动中止）
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Continue generation error:', error)
        state.updateMessage(messageId, { hasError: true })
      }
      state.stopStreaming()
      state.setLoading(false)
    }
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
