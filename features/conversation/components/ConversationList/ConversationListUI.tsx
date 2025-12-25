'use client'

/**
 * Conversation List UI Component - 会话列表UI组件
 * 
 * 纯展示组件，接收所有状态和方法通过props
 */

import { useState } from 'react'
import { History } from 'lucide-react'
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
  _loading?: boolean
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onTogglePin: (id: string, isPinned: boolean) => void
}

export function ConversationListUI({
  conversations,
  currentConversationId,
  _loading,
  onDelete,
  onRename,
  onTogglePin,
}: ConversationListUIProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)

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

  return (
    <>
      {/* 历史会话标题 */}
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">历史会话</span>
      </div>

      {conversations.length === 0 ? (
        <div className="py-4">
          <p className="text-xs text-muted-foreground px-3">
            暂无历史对话
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentConversationId}
              onDelete={() => handleDeleteClick(conversation.id)}
              onRename={(newTitle) => onRename(conversation.id, newTitle)}
              onTogglePin={(isPinned) => onTogglePin(conversation.id, isPinned)}
            />
          ))}
        </div>
      )}

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

