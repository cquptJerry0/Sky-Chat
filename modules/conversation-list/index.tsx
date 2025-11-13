'use client'

/**
 * Conversation List Module - 会话列表模块
 * 
 * Container Component（容器组件）
 * 零props设计，所有数据从store获取
 * 
 * 架构：
 * - useChatStore: 获取会话状态和方法
 * - ConversationListUI: 纯UI组件
 * 
 * @module modules/conversation-list
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useChatStore } from '@/lib/stores/chat.store'
import { ConversationListUI } from './ConversationListUI'

/**
 * 会话列表模块容器组件
 * 
 * 零props设计，所有数据从store获取
 */
export function ConversationList() {
  const router = useRouter()
  
  // 从store获取状态（使用filteredConversations支持搜索）
  const conversations = useChatStore((s) => s.filteredConversations)
  const currentConversationId = useChatStore((s) => s.currentConversationId)
  const loading = useChatStore((s) => s.conversationsLoading)
  
  // 从store获取方法
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const updateConversationTitle = useChatStore((s) => s.updateConversationTitle)
  const loadConversations = useChatStore((s) => s.loadConversations)

  // 初始化：加载会话列表（只执行一次）
  React.useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // 处理删除 - 包含导航逻辑
  const handleDelete = async (id: string) => {
    // 如果删除的是当前会话，需要先导航到其他会话
    const isDeletingCurrent = id === currentConversationId

    if (isDeletingCurrent) {
      // 先找到下一个会话
      const allConversations = useChatStore.getState().conversations
      const nextConversation = allConversations.find((c) => c.id !== id)

      if (nextConversation) {
        // 有其他会话，先导航过去（这样 currentConversationId 会被更新）
        router.push(`/chat/${nextConversation.id}`)

        // 等待导航完成后再删除（避免 useEffect 重复触发）
        await new Promise((resolve) => setTimeout(resolve, 100))
      } else {
        // 没有其他会话，先导航到新建页面
        router.push('/chat')
      }
    }

    // 执行删除
    await deleteConversation(id)
  }

  // 将所有状态和方法传递给UI组件
  return (
    <ConversationListUI
      conversations={conversations}
      currentConversationId={currentConversationId}
      loading={loading}
      onDelete={handleDelete}
      onRename={updateConversationTitle}
    />
  )
}

