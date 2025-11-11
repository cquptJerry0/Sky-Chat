'use client'

/**
 * Home Page - 首页
 * 
 * 根据登录状态显示不同内容：
 * - 未登录：显示落地页，收集待发送消息
 * - 已登录：
 *   - 有待发送消息：创建会话并发送
 *   - 无待发送消息：重定向到最近会话或 /chat
 * 
 * @module app/page
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useChatStore } from '@/lib/stores/chat.store'
import { LandingPage } from '@/components/LandingPage'
import { Loading } from '@/components/Loading'
import { useLoading } from '@/lib/hooks/use-loading'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'
import { ConversationAPI } from '@/lib/services/conversation-api'

/**
 * 首页组件
 * 手动处理认证状态，不使用 AuthGuard
 */
export default function HomePage() {
  const { status } = useSession()
  const router = useRouter()
  const loadConversations = useChatStore((s) => s.loadConversations)
  const { withLoading, shouldShowLoading } = useLoading()
  const [isProcessing, setIsProcessing] = React.useState(false)
  
  // 已登录时的重定向逻辑
  React.useEffect(() => {
    if (status !== 'authenticated' || isProcessing) return

    const handleAuthenticatedRedirect = async () => {
      setIsProcessing(true)

      await withLoading(async () => {
        try {
          // 1. 检查是否有待发送消息
          const pendingMessage = StorageManager.get<string>(STORAGE_KEYS.PENDING_MESSAGE)

          if (pendingMessage) {
            console.log('[HomePage] Found pending message, creating conversation...')
            
            // 有待发送消息：创建会话并跳转
            try {
              const { conversation } = await ConversationAPI.create()
              
              // 跳转到新会话并携带消息
              router.push(`/chat/${conversation.id}?message=${encodeURIComponent(pendingMessage)}`)
  
              // 清除待发送消息
              StorageManager.remove(STORAGE_KEYS.PENDING_MESSAGE)
              return
            } catch (error) {
              console.error('[HomePage] Failed to create conversation:', error)
              // 创建失败时清除待发送消息，继续正常流程
              StorageManager.remove(STORAGE_KEYS.PENDING_MESSAGE)
  }
          }

          // 2. 无待发送消息：正常重定向（静默加载）
          console.log('[HomePage] No pending message, loading conversations...')
          await loadConversations()
          const conversations = useChatStore.getState().conversations

          if (conversations.length > 0) {
            // 有会话：重定向到最近的会话
            console.log('[HomePage] Redirecting to latest conversation')
            router.push(`/chat/${conversations[0].id}`)
          } else {
            // 无会话：重定向到空白聊天页
            console.log('[HomePage] No conversations, redirecting to /chat')
            router.push('/chat')
          }
        } catch (error) {
          console.error('[HomePage] Redirect error:', error)
          // 出错时重定向到空白聊天页
          router.push('/chat')
        }
      }, 'visible') // 显示 loading
    }

    handleAuthenticatedRedirect()
  }, [status, isProcessing, router, loadConversations, withLoading])

  // 加载中
  if (status === 'loading') {
    return <Loading />
  }

  // 未登录：显示落地页
  if (status === 'unauthenticated') {
    return <LandingPage />
  }

  // 已登录：显示重定向中（根据 loading 状态）
  if (shouldShowLoading) {
    return <Loading text="正在打开会话..." />
  }
  
  return <Loading text="正在打开会话..." />
}
