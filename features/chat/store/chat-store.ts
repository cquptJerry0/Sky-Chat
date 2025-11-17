/**
 * Chat Store - 消息状态管理
 * 
 * 负责消息的增删改查、流式传输状态
 */

import { create } from 'zustand'
import type { Message, AbortReason } from '@/lib/types/chat'

type StreamingPhase = 'thinking' | 'answer' | null

interface ChatState {
  // 消息列表
  messages: Message[]
  
  // 流式传输状态
  streamingMessageId: string | null
  streamingPhase: StreamingPhase
  abortReason: AbortReason | null
  continueAbortController: AbortController | null
  
  // 分页状态
  hasOlderMessages: boolean
  isLoadingOlder: boolean
  oldestMessageId: string | null
  newestMessageId: string | null
  
  // 发送状态
  isSendingMessage: boolean
  
  // Actions
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  appendThinking: (id: string, chunk: string) => void
  appendContent: (id: string, chunk: string) => void
  startStreaming: (messageId: string, phase: StreamingPhase) => void
  stopStreaming: (reason?: AbortReason) => void
  setSendingMessage: (loading: boolean) => void
  clearMessages: () => void
  setMessages: (messages: Message[]) => void
  prependMessages: (messages: Message[]) => void
  reset: () => void
}

const initialState = {
  messages: [],
  streamingMessageId: null,
  streamingPhase: null as StreamingPhase,
  abortReason: null as AbortReason | null,
  continueAbortController: null,
  hasOlderMessages: true,
  isLoadingOlder: false,
  oldestMessageId: null,
  newestMessageId: null,
  isSendingMessage: false,
}

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id: string, updates: Partial<Message>) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  appendThinking: (id: string, chunk: string) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, thinking: (msg.thinking || '') + chunk } : msg
      ),
    })),

  appendContent: (id: string, chunk: string) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + chunk } : msg
      ),
    })),

  startStreaming: (messageId: string, phase: StreamingPhase) =>
    set({
      streamingMessageId: messageId,
      streamingPhase: phase,
    }),

  stopStreaming: (reason?: AbortReason) => {
    set((state) => {
      if (state.continueAbortController) {
        state.continueAbortController.abort()
      }
      return {
        streamingMessageId: null,
        streamingPhase: null,
        abortReason: reason || null,
        continueAbortController: null,
      }
    })
  },

  setSendingMessage: (loading) => set({ isSendingMessage: loading }),

  clearMessages: () =>
    set({
      messages: [],
      hasOlderMessages: true,
      oldestMessageId: null,
      newestMessageId: null,
    }),

  setMessages: (messages) =>
    set({
      messages,
      oldestMessageId: messages[0]?.id || null,
      newestMessageId: messages[messages.length - 1]?.id || null,
    }),

  prependMessages: (newMessages) =>
    set((state) => {
      const combined = [...newMessages, ...state.messages]
      return {
        messages: combined,
        oldestMessageId: combined[0]?.id || null,
      }
    }),

  reset: () => set(initialState),
}))

