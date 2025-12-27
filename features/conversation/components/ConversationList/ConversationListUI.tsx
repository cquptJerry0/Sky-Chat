'use client'

/**
 * Conversation List UI Component - 会话列表UI组件
 * 
 * 纯展示组件，接收所有状态和方法通过props
 * 支持多选删除：Ctrl+点击切换选中，Shift+点击范围选中
 */

import { useState, useCallback } from 'react'
import { History, Trash2 } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import { Button } from '@/components/ui/button'
import type { ConversationData } from '@/app/actions/conversation'
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
  conversations: ConversationData[]
  currentConversationId: string | null
  showSkeleton?: boolean
  onDelete: (id: string) => void
  onDeleteMultiple?: (ids: string[]) => void
  onRename: (id: string, newTitle: string) => void
  onTogglePin: (id: string, isPinned: boolean) => void
}

/** Skeleton 占位组件 */
function ConversationSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
      ))}
    </div>
  )
}

export function ConversationListUI({
  conversations,
  currentConversationId,
  showSkeleton = false,
  onDelete,
  onDeleteMultiple,
  onRename,
  onTogglePin,
}: ConversationListUIProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  
  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)

  // 处理多选点击
  const handleItemClick = useCallback((id: string, e: React.MouseEvent) => {
    // Ctrl/Cmd + 点击：切换单个选中
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
      setLastClickedId(id)
      return true // 阻止导航
    }
    
    // Shift + 点击：范围选中
    if (e.shiftKey && lastClickedId) {
      e.preventDefault()
      const ids = conversations.map(c => c.id)
      const startIdx = ids.indexOf(lastClickedId)
      const endIdx = ids.indexOf(id)
      
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const rangeIds = ids.slice(from, to + 1)
        
        setSelectedIds(prev => {
          const next = new Set(prev)
          rangeIds.forEach(rid => next.add(rid))
          return next
        })
      }
      return true // 阻止导航
    }
    
    // 普通点击：清除选中
    if (selectedIds.size > 0) {
      setSelectedIds(new Set())
    }
    setLastClickedId(id)
    return false // 允许导航
  }, [conversations, lastClickedId, selectedIds.size])

  // 清除选中
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return
    setDeleteDialogOpen(true)
    setConversationToDelete(null) // 标记为批量删除
  }, [selectedIds.size])

  const handleDeleteClick = (id: string) => {
    setConversationToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (conversationToDelete) {
      // 单个删除
      onDelete(conversationToDelete)
    } else if (selectedIds.size > 0) {
      // 批量删除
      if (onDeleteMultiple) {
        onDeleteMultiple(Array.from(selectedIds))
      } else {
        // fallback: 逐个删除
        selectedIds.forEach(id => onDelete(id))
      }
      setSelectedIds(new Set())
    }
    setDeleteDialogOpen(false)
    setConversationToDelete(null)
  }

  const deleteCount = conversationToDelete ? 1 : selectedIds.size

  return (
    <>
      {/* 历史会话标题 + 批量删除按钮 */}
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">历史会话</span>
        </div>
        
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{selectedIds.size} 项</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              删除
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={clearSelection}
            >
              取消
            </Button>
          </div>
        )}
      </div>

      {showSkeleton ? (
        <ConversationSkeleton />
      ) : conversations.length === 0 ? (
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
              isSelected={selectedIds.has(conversation.id)}
              onSelect={(e) => handleItemClick(conversation.id, e)}
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
              删除{deleteCount > 1 ? ` ${deleteCount} 个` : ''}对话？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              此操作无法撤销，{deleteCount > 1 ? '所选会话' : '会话'}中的所有消息都将被永久删除。
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

