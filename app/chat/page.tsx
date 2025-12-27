'use client'

/**
 * Chat Redirect Page - 聊天重定向页面
 * 
 * 访问 /chat 时自动创建新会话并重定向到 /chat/{conversationId}
 * 支持 ?msg= 参数传递 pending message
 * 
 * @module app/chat/page
 */

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConversationStore } from '@/features/conversation/store/conversation-store'
import { AuthGuard } from '@/features/auth/components/AuthGuard'

function ChatRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCreatingRef = useRef(false)

  useEffect(() => {
    // 使用 ref 防止重复创建，比 state 更可靠
    if (isCreatingRef.current) return
    isCreatingRef.current = true

    const createAndRedirect = async () => {
      try {
        const newId = await useConversationStore.getState().createConversation()
        // 保留 msg 参数
        const msg = searchParams.get('msg')
        const url = msg ? `/chat/${newId}?msg=${msg}` : `/chat/${newId}`
        router.replace(url)
      } catch (error) {
        console.error('[ChatRedirect] Failed to create conversation:', error)
        isCreatingRef.current = false // 失败时重置，允许重试
        router.push('/')
      }
    }

    createAndRedirect()
  }, [router, searchParams])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">正在创建新会话...</div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <AuthGuard redirectTo="/">
      <ChatRedirect />
    </AuthGuard>
  )
}
