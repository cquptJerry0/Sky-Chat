'use client'

/**
 * Conversation List UI Component - 会话列表UI组件
 * 
 * 纯展示组件，接收所有状态和方法通过props
 */

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import type { Conversation } from '@/lib/services/conversation-api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConversationListUIProps {
  conversations: Conversation[]
  currentConversationId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
}

export function ConversationListUI({
  conversations,
  currentConversationId,
  loading,
  onSelect,
  onDelete,
  onRename,
}: ConversationListUIProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [conversationToDelete, setConversationToDelete] = React.useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setConversationToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (conversationToDelete) {
      onDelete(conversationToDelete)
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="py-4">
        <p className="text-xs text-muted-foreground px-3">
          暂无历史对话
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === currentConversationId}
            onSelect={() => onSelect(conversation.id)}
            onDelete={() => handleDeleteClick(conversation.id)}
            onRename={(newTitle) => onRename(conversation.id, newTitle)}
          />
        ))}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              删除对话？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              此操作无法撤销，会话中的所有消息都将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

