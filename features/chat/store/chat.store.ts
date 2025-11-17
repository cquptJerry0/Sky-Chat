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

  /** 消息发送加载状态 */
  isSendingMessage: boolean

  /** 会话切换加载状态 */
  isSwitchingConversation: boolean

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
   * 设置消息发送加载状态
   */
  setSendingMessage: (loading: boolean) => void

  /**
   * 设置会话切换加载状态
   */
  setSwitchingConversation: (loading: boolean) => void
  
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
   * 置顶/取消置顶会话
   */
  toggleConversationPin: (id: string, isPinned: boolean) => Promise<void>

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
   */
  sendMessage: (content: string, options?: { createUserMessage?: boolean }) => Promise<void>

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
  isSwitchingConversation: false,
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
  addMessage: (message: Message) =>
    set((state) => {
      console.log('[Store] addMessage called, ID:', message.id, 'role:', message.role, 'current count:', state.messages.length)
      return {
        messages: [...state.messages, message],
      }
    }),
  
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
    set((state) => {
      const targetMessage = state.messages.find(m => m.id === id)
      console.log('[Store] appendContent called for:', id, 'found:', !!targetMessage, 'chunk:', chunk.slice(0, 20))

      return {
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, content: (m.content || '') + chunk } : m
        ),
      }
    }),
  
  // ============ Streaming Control ============
  startStreaming: (messageId: string, phase: StreamingPhase) =>
    set({ 
      streamingMessageId: messageId, 
      streamingPhase: phase,
      abortReason: null, // 开始新的流式传输时清除之前的中断原因
    }),
  
  stopStreaming: (reason?: AbortReason) => {
    // 中止续传请求（如果存在）
    const state = useChatStore.getState()
    if (state.continueAbortController) {
      state.continueAbortController.abort(
        new DOMException('Generation stopped', 'AbortError')
      )
    }

    // 中断原因已移除，不再需要标记暂停状态
    
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

    } catch (error) {
      console.error('[ChatStore] Failed to save model to localStorage:', error)
    }

    set({ selectedModel: modelId })
  },

  toggleThinking: (enabled) => set({ enableThinking: enabled }),

  setSendingMessage: (loading) => set({ isSendingMessage: loading }),

  setSwitchingConversation: (loading) => set({ isSwitchingConversation: loading }),
  
  // ============ Conversation Actions ============
  setConversationId: (id) => {
    console.log('[Store] setConversationId called:', id)
    set({ currentConversationId: id })
  },
  
  loadConversations: async () => {
    set({ conversationsLoading: true })
    try {
      const { conversations } = await ConversationAPI.list()

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

      // 排序：置顶的在前，按 pinnedAt 或 updatedAt 排序
      const sortedConversations = [...conversations].sort((a, b) => {
        // 置顶的排在前面
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1

        // 都置顶或都不置顶，按时间排序
        if (a.isPinned && b.isPinned) {
          return new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime()
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      set({
        conversations: sortedConversations,
        filteredConversations: sortedConversations,
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
    console.log('[Store] createNewConversation called')
    try {
      const { conversation } = await ConversationAPI.create()
      console.log('[Store] createNewConversation: clearing messages for new conversation:', conversation.id)
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
    console.log('[Store] switchConversation called, target ID:', id, 'current ID:', useChatStore.getState().currentConversationId)

    const startTime = Date.now()
    const MIN_LOADING_TIME = 600 // 最小 loading 时间 0.6 秒

    // 立即设置 loading 状态和会话 ID
    console.log('[Store] switchConversation: setting loading state and clearing messages')
    set({ isSwitchingConversation: true, currentConversationId: id })

    try {
      // 加载消息
      const { messages } = await ConversationAPI.getMessages(id)
      console.log('[Store] switchConversation: loaded', messages.length, 'messages')

      // 计算已经过去的时间
      const elapsed = Date.now() - startTime
      const remaining = MIN_LOADING_TIME - elapsed

      // 如果加载太快，等待剩余时间
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining))
      }

      // 更新消息和状态
      console.log('[Store] switchConversation: updating messages in store')
      set({
        messages: messages as Message[],
        isSwitchingConversation: false,
        hasOlderMessages: messages.length >= 50,
        oldestMessageId: messages[0]?.id || null,
        newestMessageId: messages[messages.length - 1]?.id || null,
      })
    } catch (error) {
      console.error('[ChatStore] Failed to switch conversation:', error)

      // 检查是否是 404 错误（会话不存在）
      const is404 =
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 404

      if (is404) {
        console.warn('[ChatStore] Conversation not found, may have been deleted')
      }

      // 确保最小 loading 时间后再显示错误
      const elapsed = Date.now() - startTime
      const remaining = MIN_LOADING_TIME - elapsed
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining))
      }

      set({ isSwitchingConversation: false, messages: [] })

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
          } catch {
            // 忽略验证错误
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

  toggleConversationPin: async (id, isPinned) => {
    try {
      const { conversation } = await ConversationAPI.togglePin(id, isPinned)

      // 更新本地状态
      set((state) => {
        const updateConversation = (c: Conversation) =>
          c.id === id ? { ...c, isPinned: conversation.isPinned, pinnedAt: conversation.pinnedAt } : c

        // 更新后重新排序：置顶的在前，按 pinnedAt 或 updatedAt 排序
        const sortConversations = (conversations: Conversation[]) => {
          return [...conversations.map(updateConversation)].sort((a, b) => {
            // 置顶的排在前面
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1

            // 都置顶或都不置顶，按时间排序
            if (a.isPinned && b.isPinned) {
              return new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime()
            }

            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
        }

        return {
          conversations: sortConversations(state.conversations),
          filteredConversations: sortConversations(state.filteredConversations),
        }
      })
    } catch (error) {
      console.error('Failed to toggle conversation pin:', error)
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
  
  // ============ 统一的消息发送方法 ============
  sendMessage: async (content, options = {}) => {
    const { createUserMessage = true } = options
    const state = useChatStore.getState()

    // 如果正在发送，忽略
    if (state.isSendingMessage) {
      console.warn('[Store] Already sending message, ignoring')
      return
    }

    const { nanoid } = await import('nanoid')

    // 生成消息 ID
    const userMessageId = createUserMessage ? nanoid() : undefined
    const aiMessageId = nanoid()

    console.log('[Store] ========== SEND MESSAGE ==========')
    console.log('[Store] Content:', content)
    console.log('[Store] CreateUserMessage:', createUserMessage)
    console.log('[Store] UserMessageId:', userMessageId)
    console.log('[Store] AiMessageId:', aiMessageId)

    // 如果需要创建 user 消息，添加到 store
    if (createUserMessage && userMessageId) {
      const userMsg: Message = {
        id: userMessageId,
        role: 'user',
        content,
      }
      state.addMessage(userMsg)
      console.log('[Store] User message added')
    }

    // 创建 AI 消息
    const aiMsg: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      thinking: '',
    }
    state.addMessage(aiMsg)
    console.log('[Store] AI message added, ID:', aiMessageId)

    // 设置发送状态
    set({ isSendingMessage: true })

    try {
      // 获取或创建会话
      let conversationId = state.currentConversationId

      if (!conversationId) {
        const { conversation } = await ConversationAPI.create()
        conversationId = conversation.id
        set({ currentConversationId: conversationId })

        // 更新 URL
        if (typeof window !== 'undefined' && window.location.pathname === '/chat') {
          window.history.replaceState(null, '', `/chat/${conversationId}`)
        }

        // 添加到会话列表
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          filteredConversations: [conversation, ...state.filteredConversations],
        }))
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

      SSEParser.parseStream(reader).subscribe({
        next: (data) => {
          console.log('[Store SSE] Received:', data.type, data.content?.slice(0, 20))

          if (data.type === 'thinking' && data.content) {
            if (state.streamingPhase !== 'thinking') {
              state.startStreaming(aiMessageId, 'thinking')
            }
            state.appendThinking(aiMessageId, data.content)
          } else if (data.type === 'answer' && data.content) {
            if (state.streamingPhase !== 'answer') {
              state.startStreaming(aiMessageId, 'answer')
            }
            state.appendContent(aiMessageId, data.content)
          } else if (data.type === 'complete') {
            state.stopStreaming()
            set({ isSendingMessage: false })
          }
        },
        error: (error) => {
          console.error('[Store SSE] Error:', error)
          state.updateMessage(aiMessageId, { hasError: true })
          state.stopStreaming()
          set({ isSendingMessage: false })
        },
        complete: () => {
          console.log('[Store SSE] Complete')
          state.stopStreaming()
          set({ isSendingMessage: false })
        },
      })
    } catch (error) {
      console.error('[Store] Send message error:', error)
      state.updateMessage(aiMessageId, { hasError: true })
      state.stopStreaming()
      set({ isSendingMessage: false })
    }
  },

  // 重试消息：删除失败的 AI 消息，重新发送
  retryMessage: (messageId) => {
    const state = useChatStore.getState()
    const messageIndex = state.messages.findIndex((m) => m.id === messageId)

    if (messageIndex === -1) return

    const message = state.messages[messageIndex]

    if (message.role === 'assistant') {
      // 删除该AI消息及其之后的所有消息
      const newMessages = state.messages.slice(0, messageIndex)

      // 找到最后一个用户消息
      const lastUserMessage = [...newMessages]
        .reverse()
        .find((m) => m.role === 'user')

      if (lastUserMessage) {
        // 更新消息列表
        set({ messages: newMessages })

        // 重新发送（不创建 user 消息）
        state.sendMessage(lastUserMessage.content, { createUserMessage: false })
      }
    }
  },

  // 编辑并重发：删除旧消息，发送新消息
  editAndResend: (messageId, newContent) => {
    const state = useChatStore.getState()
    const messageIndex = state.messages.findIndex((m) => m.id === messageId)

    if (messageIndex === -1) return

    const message = state.messages[messageIndex]
    if (message.role !== 'user') return

    // 删除该消息及之后的所有消息
    const messagesBefore = state.messages.slice(0, messageIndex)
    set({ messages: messagesBefore })

    // 发送新消息（创建新的 user 消息）
    state.sendMessage(newContent, { createUserMessage: true })
  },
  
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
    state.setSendingMessage(true)

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
            state.setSendingMessage(false)
          }
        },
        error: (error) => {
          // AbortError 是正常中断，不需要特殊处理
          if (error.name === 'AbortError') {

          } else {
            console.error('Continue generation error:', error)
            state.updateMessage(messageId, { hasError: true })
          }
          state.stopStreaming()
          state.setSendingMessage(false)
        },
        complete: () => {
          state.stopStreaming()
          state.setSendingMessage(false)
        },
      })
    } catch (error) {
      // 忽略AbortError（用户主动中止）
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Continue generation error:', error)
        state.updateMessage(messageId, { hasError: true })
      }
      state.stopStreaming()
      state.setSendingMessage(false)
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
