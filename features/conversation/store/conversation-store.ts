/**
 * Conversation Store - 会话管理
 * 
 * 负责会话列表、切换、创建、删除等操作
 */

import { create } from 'zustand'
import {
  ConversationAPI,
  type Conversation,
} from '@/lib/services/conversation-api'

interface ConversationState {
  // 当前会话
  currentConversationId: string | null
  
  // 会话列表
  conversations: Conversation[]
  filteredConversations: Conversation[]
  conversationsLoading: boolean
  
  // 切换状态
  isSwitchingConversation: boolean
  
  // Actions
  setConversationId: (id: string | null) => void
  loadConversations: () => Promise<void>
  setFilteredConversations: (conversations: Conversation[]) => void
  createNewConversation: () => Promise<void>
  switchConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  toggleConversationPin: (id: string, isPinned: boolean) => Promise<void>
  setSwitchingConversation: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  currentConversationId: null,
  conversations: [],
  filteredConversations: [],
  conversationsLoading: false,
  isSwitchingConversation: false,
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  ...initialState,

  setConversationId: (id) => {
    set({ currentConversationId: id })
  },

  loadConversations: async () => {
    set({ conversationsLoading: true })
    try {
      const data = await ConversationAPI.getAll()
      set({
        conversations: data,
        filteredConversations: data,
        conversationsLoading: false,
      })
    } catch (error) {
      console.error('Failed to load conversations:', error)
      set({ conversationsLoading: false })
    }
  },

  setFilteredConversations: (conversations: Conversation[]) =>
    set({ filteredConversations: conversations }),

  createNewConversation: async () => {
    set({ currentConversationId: null })
  },

  switchConversation: async (id) => {
    set({ isSwitchingConversation: true, currentConversationId: id })
    set({ isSwitchingConversation: false })
  },

  deleteConversation: async (id) => {
    try {
      await ConversationAPI.delete(id)
      const { conversations, currentConversationId } = get()
      const updated = conversations.filter((c) => c.id !== id)
      
      set({
        conversations: updated,
        filteredConversations: updated,
        currentConversationId:
          currentConversationId === id ? null : currentConversationId,
      })
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      throw error
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
      throw error
    }
  },

  toggleConversationPin: async (id, isPinned) => {
    try {
      await ConversationAPI.togglePin(id, isPinned)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, isPinned } : c
        ),
        filteredConversations: state.filteredConversations.map((c) =>
          c.id === id ? { ...c, isPinned } : c
        ),
      }))
    } catch (error) {
      console.error('Failed to toggle conversation pin:', error)
      throw error
    }
  },

  setSwitchingConversation: (loading) => set({ isSwitchingConversation: loading }),

  reset: () => set(initialState),
}))

