'use client'

/**
 * Conversation List Module - 会话列表模块
 * 
 * 零props设计，所有数据从store获取
 * currentConversationId 从 URL 获取
 * 支持多选删除：Ctrl+点击切换选中，Shift+点击范围选中
 * 
 * @module modules/conversation-list
 */

import { useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useConversationStore } from '@/features/conversation/store/conversation-store'
import { ConversationListUI } from './ConversationListUI'

export function ConversationList() {
  const router = useRouter()
  const params = useParams()
  
  // 从 URL 获取当前会话 ID
  const currentConversationId = params.conversationId as string | undefined

  // 从store获取状态
  const conversations = useConversationStore((s) => s.filteredConversations)
  const loading = useConversationStore((s) => s.conversationsLoading)
  const hasInitiallyLoaded = useConversationStore((s) => s.hasInitiallyLoaded)

  // 从store获取方法
  const deleteConversation = useConversationStore((s) => s.deleteConversation)
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle)
  const toggleConversationPin = useConversationStore((s) => s.toggleConversationPin)
  const loadConversations = useConversationStore((s) => s.loadConversations)

  // 初始化：加载会话列表
  useEffect(() => {
    loadConversations()
  }, [loadConversations])
  
  // 处理单个删除
  const handleDelete = useCallback(async (id: string) => {
    const isDeletingCurrent = id === currentConversationId

    if (isDeletingCurrent) {
      const allConversations = useConversationStore.getState().conversations
      const nextConversation = allConversations.find((c) => c.id !== id)

      if (nextConversation) {
        router.push(`/chat/${nextConversation.id}`)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } else {
        router.push('/chat')
      }
    }

    await deleteConversation(id)
  }, [currentConversationId, deleteConversation, router])

  // 处理批量删除
  const handleDeleteMultiple = useCallback(async (ids: string[]) => {
    const isDeletingCurrent = currentConversationId && ids.includes(currentConversationId)

    if (isDeletingCurrent) {
      const allConversations = useConversationStore.getState().conversations
      const nextConversation = allConversations.find((c) => !ids.includes(c.id))

      if (nextConversation) {
        router.push(`/chat/${nextConversation.id}`)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } else {
        router.push('/chat')
      }
    }

    // 并行删除
    await Promise.all(ids.map(id => deleteConversation(id)))
  }, [currentConversationId, deleteConversation, router])

  // 只在首次加载时显示 skeleton
  const showSkeleton = loading && !hasInitiallyLoaded

  return (
    <ConversationListUI
      conversations={conversations}
      currentConversationId={currentConversationId || null}
      showSkeleton={showSkeleton}
      onDelete={handleDelete}
      onDeleteMultiple={handleDeleteMultiple}
      onRename={updateConversationTitle}
      onTogglePin={toggleConversationPin}
    />
  )
}
