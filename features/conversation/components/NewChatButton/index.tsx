'use client'

/**
 * New Chat Button Component - 新建对话按钮组件
 * 
 * 点击时创建新会话并导航到 /chat/{newId}
 * 
 * @module features/conversation/components/NewChatButton
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConversationStore } from '@/features/conversation/store/conversation-store'

export function NewChatButton() {
  const router = useRouter()
  const createConversation = useConversationStore((s) => s.createConversation)
  const [isCreating, setIsCreating] = useState(false)

  const handleNewChat = async () => {
    if (isCreating) return
    
    setIsCreating(true)
    try {
      const newId = await createConversation()
      router.push(`/chat/${newId}`)
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button
      variant="ghost"
      disabled={isCreating}
      onClick={handleNewChat}
      className="w-full justify-start gap-3 hover:bg-[hsl(var(--sidebar-hover))] dark:hover:bg-[hsl(var(--sidebar-hover))]"
    >
      <PenSquare className="h-4 w-4" />
      <span>{isCreating ? '创建中...' : '新建对话'}</span>
    </Button>
  )
}
