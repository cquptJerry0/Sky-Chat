'use client'

/**
 * Conversation List Module - 会话列表模块
 * 
 * 零props设计，所有数据从store获取
 * currentConversationId 从 URL 获取
 * 
 * @module modules/conversation-list
 */

import { useEffect } from 'react'
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

  // 从store获取方法
  const deleteConversation = useConversationStore((s) => s.deleteConversation)
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle)
  const toggleConversationPin = useConversationStore((s) => s.toggleConversationPin)
  const loadConversations = useConversationStore((s) => s.loadConversations)

  // 初始化：加载会话列表
  useEffect(() => {
    loadConversations()
  }, [loadConversations])
  
  // 处理删除
  const handleDelete = async (id: string) => {
    const isDeletingCurrent = id === currentConversationId

    if (isDeletingCurrent) {
      const allConversations = useConversationStore.getState().conversations
      const nextConversation = allConversations.find((c) => c.id !== id)

      if (nextConversation) {
        router.push(`/chat/${nextConversation.id}`)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } else {
        // 没有其他会话，创建新会话
        router.push('/chat')
      }
    }

    await deleteConversation(id)
  }

  return (
    <ConversationListUI
      conversations={conversations}
      currentConversationId={currentConversationId || null}
      _loading={loading}
      onDelete={handleDelete}
      onRename={updateConversationTitle}
      onTogglePin={toggleConversationPin}
    />
  )
}
