'use client'

/**
 * New Chat Page - 空白聊天页
 * 
 * 已登录用户的空白对话页面
 * - 不预先创建会话
 * - 用户发送第一条消息时才创建会话
 * - 会话创建后自动更新URL
 * 
 * @module app/chat/page
 */

import * as React from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { MessageList } from '@/modules/message-list'
import { ChatInput } from '@/modules/chat-input'
import { ConversationList } from '@/modules/conversation-list'
import { NewChatButton } from '@/components/NewChatButton'
import { ConversationSearch } from '@/components/ConversationSearch'
import { MainLayout } from '@/components/MainLayout'
import { AuthGuard } from '@/components/AuthGuard'

// 提升Sidebar到外层，避免重新渲染
const ChatSidebar = React.memo(() => (
  <Sidebar isLeader={true}>
    <div className="space-y-2">
      {/* 新建对话按钮模块 */}
      <NewChatButton />
      
      {/* 会话搜索模块 */}
      <ConversationSearch />
      
      {/* 会话列表模块 */}
      <ConversationList />
    </div>
  </Sidebar>
))

ChatSidebar.displayName = 'ChatSidebar'

/**
 * 新建聊天内容组件
 */
function NewChatContent() {
  return (
    <MainLayout sidebar={<ChatSidebar />}>
      {/* Header（顶部固定） */}
      <Header />
      
      {/* 虚拟滚动消息列表（包含空状态） */}
      <MessageList />
      
      {/* 输入框（固定在底部） */}
      <ChatInput />
    </MainLayout>
  )
}

/**
 * 新建聊天页面组件 - 使用 AuthGuard 保护
 */
export default function NewChatPage() {
  return (
    <AuthGuard redirectTo="/">
      <NewChatContent />
    </AuthGuard>
  )
}

