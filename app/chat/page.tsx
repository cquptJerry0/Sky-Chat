'use client'

/**
 * Chat Redirect Page - 聊天重定向页面
 * 
 * 访问 /chat 时自动创建新会话并重定向到 /chat/{conversationId}
 * 
 * @module app/chat/page
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConversationStore } from '@/features/conversation/store/conversation-store'
import { AuthGuard } from '@/features/auth/components/AuthGuard'

function ChatRedirect() {
  const router = useRouter()
  const isCreatingRef = useRef(false)

  useEffect(() => {
    // 使用 ref 防止重复创建，比 state 更可靠
    if (isCreatingRef.current) return
    isCreatingRef.current = true

    const createAndRedirect = async () => {
      try {
        const newId = await useConversationStore.getState().createConversation()
        router.replace(`/chat/${newId}`)
      } catch (error) {
        console.error('[ChatRedirect] Failed to create conversation:', error)
        isCreatingRef.current = false // 失败时重置，允许重试
        router.push('/')
      }
    }

    createAndRedirect()
  }, [router])

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
