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
import { useChatStore } from '@/lib/stores/chat.store'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { ChatMessage } from '@/modules/chat-message'
import { ChatInput } from '@/modules/chat-input'
import { ConversationList } from '@/modules/conversation-list'
import { NewChatButton } from '@/components/NewChatButton'
import { ConversationSearch } from '@/components/ConversationSearch'
import { MainLayout } from '@/components/MainLayout'
import { AuthGuard } from '@/components/AuthGuard'

/**
 * 新建聊天内容组件
 */
function NewChatContent() {
  const messages = useChatStore((s) => s.messages)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  
  // 自动滚动到底部
  const scrollToBottom = React.useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, [])
  
  // 监听消息数量变化，自动滚动
  React.useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])
  
  // 监听流式传输时的内容变化，自动滚动
  React.useEffect(() => {
    if (streamingMessageId) {
      const streamingMessage = messages.find(m => m.id === streamingMessageId)
      if (streamingMessage) {
        const timeoutId = setTimeout(scrollToBottom, 100)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [messages, streamingMessageId, scrollToBottom])
  
  return (
    <MainLayout
      sidebar={
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
      }
    >
      {/* Header（顶部固定） */}
      <Header />
      
      {messages.length === 0 ? (
        // 空状态 - 欢迎界面
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-[32px] font-normal text-[hsl(var(--text-primary))] mb-8">
              我能帮你什么？
            </h1>
          </div>
        </div>
      ) : (
        // 消息列表
        <main 
          ref={messagesContainerRef} 
          className="flex-1 overflow-y-auto pb-40"
        >
          <div className="mx-auto max-w-3xl px-6 pt-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} messageId={message.id} />
            ))}
          </div>
        </main>
      )}
      
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

