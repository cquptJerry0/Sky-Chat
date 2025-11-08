'use client'

/**
 * Main Chat Page - 主聊天页面
 * 
 * 零 props 布局组件，只负责页面结构
 * 所有状态和逻辑都封装在 Module 中
 * 
 * 架构：
 * - Sidebar: 侧边栏（新建对话等）
 * - ChatMessage: 消息列表（Module，零 props）
 * - ChatInput: 输入框（Module，零 props）
 * 
 * @module app/page
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
import { MainLayout } from '@/app/layout-components/MainLayout'
import { LoginDialog } from '@/components/LoginDialog'
import { useAuth } from '@/lib/hooks/use-auth'

/**
 * 主页面组件
 * 
 * 零 props 设计，所有数据从 store 获取
 * 只负责页面布局，不包含业务逻辑
 */
export default function Home() {
  // 认证状态
  const { showLoginDialog, isLoading: authLoading } = useAuth()
  
  // 获取消息列表
  const messages = useChatStore((s) => s.messages)
  
  // 获取流式传输状态
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  
  // 消息容器引用
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
        // 使用节流避免过于频繁的滚动
        const timeoutId = setTimeout(scrollToBottom, 100)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [messages, streamingMessageId, scrollToBottom])
  
  // 显示登录对话框
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      {/* 登录对话框 */}
      <LoginDialog open={showLoginDialog} />
      
      {/* 主界面 */}
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
        
        {/* 消息列表 */}
        <main 
          ref={messagesContainerRef} 
          className="flex-1 overflow-y-auto pb-40"
        >
          {messages.length === 0 ? (
            // 空状态
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h1 className="text-[32px] font-normal text-[hsl(var(--text-primary))] mb-8">
                  我能帮你什么？
                </h1>
              </div>
            </div>
          ) : (
            // 消息列表
            <div className="mx-auto max-w-3xl px-6 pt-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} messageId={message.id} />
              ))}
            </div>
          )}
        </main>
        
        {/* 输入框（固定在底部）- 零 props */}
        <ChatInput />
    </MainLayout>
    </>
  )
}
