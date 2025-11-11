'use client'

/**
 * Conversation Item Component - 会话列表项
 * 
 * 展示单个会话，支持：
 * - 选中/激活状态
 * - 重命名
 * - 删除
 * - 置顶
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Trash2, Edit2, Check, X, MoreVertical, Eye, Pin, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/lib/services/conversation-api'
import { exportManager } from '@/lib/services/export-manager'
import { useToast } from '@/hooks/use-toast'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onDelete: () => void
  onRename: (newTitle: string) => void
}

export function ConversationItem({
  conversation,
  isActive,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(conversation.title)
  const [isHovered, setIsHovered] = React.useState(false)
  
  // 使用路由导航切换会话
  const handleSelect = React.useCallback(() => {
    router.push(`/chat/${conversation.id}`)
  }, [router, conversation.id])
  
  // 处理导出
  const handleExport = async (format: 'markdown' | 'json' = 'markdown') => {
    try {
      await exportManager.exportConversation(conversation.id, { format })
      toast({
        title: '导出成功',
        description: `会话已导出为 ${format.toUpperCase()} 格式`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: '导出失败',
        description: '导出过程中出现错误',
        variant: 'destructive',
      })
    }
  }

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(conversation.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
        isActive
          ? 'bg-[hsl(var(--sidebar-active))]'
          : 'hover:bg-[hsl(var(--sidebar-hover))]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 w-full">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 min-w-0 bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={handleSave}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={handleCancel}
          >
            <X className="h-3 w-3" />
          </Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-2 p-0 h-auto hover:bg-transparent"
            onClick={handleSelect}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm text-left">{conversation.title}</span>
          </Button>
          
          {/* 三点菜单（悬停或激活时显示） */}
          {(isHovered || isActive) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 opacity-70 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 mr-2" sideOffset={8}>
                <DropdownMenuItem onClick={handleSelect}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>查看全部</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  <span>编辑标题</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: 实现置顶功能
                    console.log('置顶会话:', conversation.id)
                  }}
                >
                  <Pin className="mr-2 h-4 w-4" />
                  <span>置顶</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExport('markdown')
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>导出</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>删除</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  )
}

