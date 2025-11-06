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
import type { Message } from '@/lib/types/chat'
import { getDefaultModel } from '@/lib/constants/models'
import { ConversationAPI, type Conversation } from '@/lib/services/conversation-api'

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
  
  /** 会话列表加载状态 */
  conversationsLoading: boolean
  
  // ============ 流式传输状态 ============
  /** 当前正在流式传输的消息 ID */
  streamingMessageId: string | null
  
  /** 当前流式传输阶段（thinking/answer） */
  streamingPhase: StreamingPhase
  
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
   */
  stopStreaming: () => void
  
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
  
  // ============ 工具方法 ============
  /**
   * 重置到初始状态（新对话）
   */
  reset: () => void
}

/**
 * 初始状态
 */
const initialState = {
  messages: [],
  isLoading: false,
  selectedModel: getDefaultModel().id,
  enableThinking: false,
  currentConversationId: null,
  conversations: [],
  conversationsLoading: false,
  streamingMessageId: null,
  streamingPhase: null as StreamingPhase,
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
      messages: [...state.messages, message]
    })),
  
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    })),
  
  appendThinking: (id, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id
          ? { ...m, thinking: (m.thinking || '') + chunk }
          : m
      )
    })),
  
  appendContent: (id, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id
          ? { ...m, content: (m.content || '') + chunk }
          : m
      )
    })),
  
  // ============ Streaming Control ============
  startStreaming: (messageId, phase) =>
    set({ 
      streamingMessageId: messageId, 
      streamingPhase: phase 
    }),
  
  stopStreaming: () =>
    set({ 
      streamingMessageId: null, 
      streamingPhase: null 
    }),
  
  // ============ Configuration Actions ============
  setModel: (modelId) =>
    set({ selectedModel: modelId }),
  
  toggleThinking: (enabled) =>
    set({ enableThinking: enabled }),
  
  setLoading: (loading) =>
    set({ isLoading: loading }),
  
  // ============ Conversation Actions ============
  setConversationId: (id) =>
    set({ currentConversationId: id }),
  
  loadConversations: async () => {
    set({ conversationsLoading: true })
    try {
      const { conversations } = await ConversationAPI.list()
      set({ conversations, conversationsLoading: false })
    } catch (error) {
      console.error('Failed to load conversations:', error)
      set({ conversationsLoading: false })
    }
  },
  
  createNewConversation: async () => {
    try {
      const { conversation } = await ConversationAPI.create()
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        messages: [],
      }))
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  },
  
  switchConversation: async (id) => {
    set({ isLoading: true, messages: [] })
    try {
      const { messages } = await ConversationAPI.getMessages(id)
      set({
        currentConversationId: id,
        messages: messages as Message[],
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to switch conversation:', error)
      set({ isLoading: false })
    }
  },
  
  deleteConversation: async (id) => {
    try {
      await ConversationAPI.delete(id)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        // 如果删除的是当前会话，清空
        currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
      }))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  },
  
  updateConversationTitle: async (id, title) => {
    try {
      await ConversationAPI.updateTitle(id, title)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      }))
    } catch (error) {
      console.error('Failed to update conversation title:', error)
    }
  },
  
  clearMessages: () =>
    set({ messages: [] }),
  
  setMessages: (messages) =>
    set({ messages }),
  
  // ============ Utility Actions ============
  reset: () =>
    set(initialState),
}))

/**
 * Selectors - 派生状态
 * 使用这些 selector 获取计算值，防止不必要的重渲染
 */
export const selectIsStreaming = (state: ChatState) => 
  state.streamingMessageId !== null

export const selectStreamingMessage = (state: ChatState) =>
  state.messages.find(m => m.id === state.streamingMessageId)

export const selectLastMessage = (state: ChatState) =>
  state.messages[state.messages.length - 1]

export const selectMessageCount = (state: ChatState) =>
  state.messages.length

