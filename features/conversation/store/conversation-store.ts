/**
 * Conversation Store - 会话列表管理
 *
 * 只负责会话列表的 CRUD 操作
 * currentConversationId 由 URL 驱动，不在此 store 中维护
 */

import { create } from 'zustand'
import {
  getConversations,
  createConversation as createConversationAction,
  deleteConversation as deleteConversationAction,
  updateConversationTitle as updateTitleAction,
  toggleConversationPin as togglePinAction,
  type ConversationData,
} from '@/app/actions/conversation'
import { sortConversations } from '@/features/conversation/utils/sort-conversations'

// 兼容旧类型
export type Conversation = ConversationData

export interface ConversationState {
 
  // 会话列表
  conversations: ConversationData[]
  filteredConversations: ConversationData[]
  conversationsLoading: boolean

  // 搜索
  searchQuery: string

  // Actions
  loadConversations: () => Promise<void>
  setFilteredConversations: (conversations: ConversationData[]) => void
  setSearchQuery: (query: string) => void
  addConversation: (conversation: ConversationData) => void
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
      const result = await getConversations()
      if (result.success && result.data) {
        const sortedConversations = sortConversations(result.data)
        set({
          conversations: sortedConversations,
          filteredConversations: sortedConversations,
          conversationsLoading: false,
        })
      } else {
        console.error('Failed to load conversations:', result.error)
        set({ conversationsLoading: false })
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      set({ conversationsLoading: false })
    }
  },

  setFilteredConversations: (conversations: ConversationData[]) =>
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

  addConversation: (conversation: ConversationData) => {
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
    const result = await createConversationAction()
    
    if (!result.success || !result.data) {
      throw new Error(result.error || '创建会话失败')
    }
    
    const conversation = result.data
    
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
      const result = await deleteConversationAction(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      
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
      const result = await updateTitleAction(id, title)
      if (!result.success) {
        throw new Error(result.error)
      }
      
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
      const result = await togglePinAction(id, isPinned)
      
      if (!result.success || !result.data) {
        throw new Error(result.error)
      }
      
      const conversation = result.data

      set((state) => {
        const updateConversation = (c: ConversationData) =>
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
