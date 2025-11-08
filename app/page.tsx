'use client'

/**
 * Home Page - 首页（重定向页面）
 * 
 * 根据会话列表自动重定向：
 * - 有会话：重定向到最近的会话
 * - 无会话：创建新会话并重定向
 * 
 * @module app/page
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '@/lib/stores/chat.store'
import { AuthGuard } from '@/components/AuthGuard'

/**
 * 首页内容组件 - 处理会话重定向逻辑
 */
function HomeContent() {
  const router = useRouter()
  const loadConversations = useChatStore((s) => s.loadConversations)
  const createNewConversation = useChatStore((s) => s.createNewConversation)
  
  const [isRedirecting, setIsRedirecting] = React.useState(false)
  
  // 加载会话列表并重定向
  React.useEffect(() => {
    // 避免重复重定向
    if (isRedirecting) return
    
    const redirectToConversation = async () => {
      setIsRedirecting(true)
      
      try {
        // 先加载会话列表
        await loadConversations()
  
        // 获取最新的会话列表
        const latestConversations = useChatStore.getState().conversations
        
        if (latestConversations.length > 0) {
          // 有会话：重定向到最近的会话
          router.push(`/chat/${latestConversations[0].id}`)
        } else {
          // 无会话：创建新会话并重定向
          await createNewConversation()
          const newConversation = useChatStore.getState().conversations[0]
          if (newConversation) {
            router.push(`/chat/${newConversation.id}`)
          }
        }
      } catch (error) {
        console.error('Failed to redirect:', error)
        setIsRedirecting(false)
      }
    }
    
    redirectToConversation()
  }, [isRedirecting, router, loadConversations, createNewConversation])
  
  // 显示重定向中的加载状态
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">正在打开会话...</p>
        </div>
      </div>
    )
  }
  
/**
 * 首页组件 - 使用 AuthGuard 保护
 */
export default function Home() {
  return (
    <AuthGuard
      loadingText="加载中..."
      unauthenticatedText="请先登录..."
    >
      <HomeContent />
    </AuthGuard>
  )
}
