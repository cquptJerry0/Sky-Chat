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
import { useChatStore } from '@/lib/stores/chat.store'
import { ConversationListUI } from './ConversationListUI'

/**
 * 会话列表模块容器组件
 * 
 * 零props设计，所有数据从store获取
 */
export function ConversationList() {
  // 从store获取状态
  const conversations = useChatStore((s) => s.conversations)
  const currentConversationId = useChatStore((s) => s.currentConversationId)
  const loading = useChatStore((s) => s.conversationsLoading)
  
  // 从store获取方法
  const switchConversation = useChatStore((s) => s.switchConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const updateConversationTitle = useChatStore((s) => s.updateConversationTitle)
  const loadConversations = useChatStore((s) => s.loadConversations)

  // 初始化：加载会话列表
  React.useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // 将所有状态和方法传递给UI组件
  return (
    <ConversationListUI
      conversations={conversations}
      currentConversationId={currentConversationId}
      loading={loading}
      onSelect={switchConversation}
      onDelete={deleteConversation}
      onRename={updateConversationTitle}
    />
  )
}

