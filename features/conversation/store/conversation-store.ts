/**
 * Conversation Store - 会话列表管理
 *
 * 只负责会话列表的 CRUD 操作
 * currentConversationId 由 URL 驱动，不在此 store 中维护
 */

import { create } from 'zustand'
import {
  ConversationAPI,
  type Conversation,
} from '@/lib/services/conversation-api'
import { sortConversations } from '@/features/conversation/utils/sort-conversations'

export interface ConversationState {
  // 会话列表
  conversations: Conversation[]
  filteredConversations: Conversation[]
  conversationsLoading: boolean

  // 搜索
  searchQuery: string

  // Actions
  loadConversations: () => Promise<void>
  setFilteredConversations: (conversations: Conversation[]) => void
  setSearchQuery: (query: string) => void
  addConversation: (conversation: Conversation) => void
  createConversation: () => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  toggleConversationPin: (id: string, isPinned: boolean) => Promise<void>
  reset: () => void
}

const initialState = {
  conversations: [],
  filteredConversations: [],
  conversationsLoading: false,
  searchQuery: '',
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  ...initialState,

  loadConversations: async () => {
    set({ conversationsLoading: true })
    try {
      const { conversations } = await ConversationAPI.list()
      const sortedConversations = sortConversations(conversations)

      set({
        conversations: sortedConversations,
        filteredConversations: sortedConversations,
        conversationsLoading: false,
      })
    } catch (error) {
      console.error('Failed to load conversations:', error)
      set({ conversationsLoading: false })
    }
  },

  setFilteredConversations: (conversations: Conversation[]) =>
    set({ filteredConversations: conversations }),

  setSearchQuery: (query) => {
    set({ searchQuery: query })

    const { conversations } = get()
    if (!query.trim()) {
      set({ filteredConversations: conversations })
      return
    }

    const filtered = conversations.filter((conv) =>
      conv.title.toLowerCase().includes(query.toLowerCase())
    )
    set({ filteredConversations: filtered })
  },

  addConversation: (conversation: Conversation) => {
    set((state) => {
      const updated = [conversation, ...state.conversations]
      const sorted = sortConversations(updated)

      return {
        conversations: sorted,
        filteredConversations: sorted,
      }
    })
  },

  /**
   * 创建新会话并返回会话 ID
   */
  createConversation: async () => {
    const { conversation } = await ConversationAPI.create()
    
    // 添加到会话列表
    set((state) => {
      const updated = [conversation, ...state.conversations]
      const sorted = sortConversations(updated)
      return {
        conversations: sorted,
        filteredConversations: sorted,
      }
    })
    
    return conversation.id
  },

  deleteConversation: async (id) => {
    try {
      await ConversationAPI.delete(id)
      const { conversations } = get()
      const updated = conversations.filter((c) => c.id !== id)
      
      set({
        conversations: updated,
        filteredConversations: updated,
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
      const { conversation } = await ConversationAPI.togglePin(id, isPinned)

      set((state) => {
        const updateConversation = (c: Conversation) =>
          c.id === id ? { ...c, isPinned: conversation.isPinned, pinnedAt: conversation.pinnedAt } : c

        const updatedConversations = state.conversations.map(updateConversation)
        const updatedFiltered = state.filteredConversations.map(updateConversation)

        return {
          conversations: sortConversations(updatedConversations),
          filteredConversations: sortConversations(updatedFiltered),
        }
      })
    } catch (error) {
      console.error('Failed to toggle conversation pin:', error)
      throw error
    }
  },

  reset: () => set(initialState),
}))
