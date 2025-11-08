'use client'

/**
 * Chat Conversation Page - 会话详情页面
 * 
 * 动态路由页面，每个会话有独立的URL
 * 从URL参数获取conversationId并加载对应的消息
 * 
 * 架构：
 * - 复用现有的 ChatMessage 和 ChatInput 组件
 * - 通过 conversationId 加载对应会话的消息
 * - 支持浏览器前进/后退
 * 
 * @module app/chat/[conversationId]/page
 */

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useChatStore } from '@/lib/stores/chat.store'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { ChatMessage } from '@/modules/chat-message'
import { ChatInput } from '@/modules/chat-input'
import { ConversationList } from '@/modules/conversation-list'
import { NewChatButton } from '@/components/NewChatButton'
import { ConversationSearch } from '@/components/ConversationSearch'
import { MainLayout } from '@/app/layout-components/MainLayout'
import { AuthGuard } from '@/components/AuthGuard'

/**
 * 会话内容组件
 * 
 * 根据URL参数加载指定会话的消息
 */
function ConversationContent() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string
  
  // 获取消息列表和当前会话ID
  const messages = useChatStore((s) => s.messages)
  const currentConversationId = useChatStore((s) => s.currentConversationId)
  const switchConversation = useChatStore((s) => s.switchConversation)
  
  // 获取流式传输状态
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  
  // 消息容器引用
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  
  // 加载状态
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  
  // 当conversationId变化时，加载对应会话的消息
  React.useEffect(() => {
    if (!conversationId) return
    
    // 如果当前会话ID与URL参数一致，不需要重新加载
    if (currentConversationId === conversationId) return
    
    const loadConversation = async () => {
      setIsLoadingMessages(true)
      try {
        await switchConversation(conversationId)
      } catch (error) {
        console.error('Failed to load conversation:', error)
        // 如果加载失败，重定向到首页
        router.push('/')
      } finally {
        setIsLoadingMessages(false)
      }
    }
    
    loadConversation()
  }, [conversationId, currentConversationId, switchConversation, router])
  
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
        
        {/* 加载状态 */}
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">加载会话中...</p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </MainLayout>
  )
}

/**
 * 会话页面组件 - 使用 AuthGuard 保护
 */
export default function ConversationPage() {
  return (
    <AuthGuard redirectTo="/">
      <ConversationContent />
    </AuthGuard>
  )
}

