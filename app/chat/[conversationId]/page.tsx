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
import { MessageList } from '@/features/chat/components/MessageList'
import { ChatInput } from '@/features/chat/components/ChatInput'
import { ConversationList } from '@/features/conversation/components/ConversationList'
import { NewChatButton } from '@/components/NewChatButton'
import { ConversationSearch } from '@/features/conversation/components/ConversationSearch'
import { MainLayout } from '@/components/MainLayout'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { useLoading } from '@/lib/hooks/use-loading'

// 提升Sidebar到外层，避免重新渲染
const ChatSidebar = React.memo(() => (
  <Sidebar>
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
 * 会话内容组件
 * 
 * 根据URL参数加载指定会话的消息
 */
function ConversationContent() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  // 获取当前会话ID
  const currentConversationId = useChatStore((s) => s.currentConversationId)
  const switchConversation = useChatStore((s) => s.switchConversation)

  // 使用 loading hook
  const { withLoading, shouldShowLoading } = useLoading()
  
  // 当 URL 的 conversationId 变化时，加载对应会话的消息
  React.useEffect(() => {
    if (!conversationId) return

    // 如果当前会话ID与URL参数一致，不需要重新加载
    if (currentConversationId === conversationId) {
      return
    }


    const loadConversation = async () => {
      await withLoading(async () => {
        try {
          await switchConversation(conversationId)
        } catch (error) {
          console.error('[ConversationPage] Failed to load conversation:', error)
          // 如果加载失败（如会话不存在），重定向到首页
          router.push('/')
        }
      }, 'visible')
    }

    loadConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentConversationId]) // 只依赖 conversationId 和 currentConversationId
  
  return (
    <MainLayout sidebar={<ChatSidebar />} header={<Header />}>
      {/* 虚拟滚动消息列表 */}
      <MessageList key={conversationId} />

      {/* 输入框（固定在底部）- 零 props */}
      <ChatInput />
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

