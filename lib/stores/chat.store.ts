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

