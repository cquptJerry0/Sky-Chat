'use client'

/**
 * ChatGPT 风格侧边栏组件
 * 
 * 提供左侧导航栏，包括：
 * - Logo 和品牌名
 * - 新建对话按钮
 * - 历史对话列表（暂未实现）
 * - 主题切换器
 */

import * as React from 'react'
import { PenSquare, MessageSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface SidebarProps {
  /** 是否为主标签页 */
  isLeader?: boolean
  /** 新建对话回调 */
  onNewChat?: () => void
  /** 额外的 CSS 类名 */
  className?: string
}

export function Sidebar({ isLeader, onNewChat, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col bg-[hsl(var(--sidebar-bg))] dark:bg-[hsl(var(--sidebar-bg))]',
        className
      )}
    >
      {/* 顶部：Logo 和新建按钮 */}
      <div className="flex flex-col gap-2 p-3">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-2">
          <MessageSquare className="h-5 w-5" />
          <span className="font-semibold text-lg">Sky Chat</span>
        </div>

        {/* 新建对话按钮（带确认） */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-[hsl(var(--sidebar-hover))] dark:hover:bg-[hsl(var(--sidebar-hover))]"
            >
              <PenSquare className="h-4 w-4" />
              <span>新建对话</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
                开始新对话？
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
                当前对话将被清空，此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                取消
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={onNewChat}
                className="bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                确定
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* 中间：历史对话列表（占据剩余空间） */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="py-2">
          <p className="text-xs text-muted-foreground px-3 py-2">
            历史记录功能即将推出...
          </p>
        </div>
      </div>

      {/* 底部：状态和设置 */}
      <div className="p-3 space-y-2 mt-auto">
        {/* Leader 状态指示 */}
        {isLeader && (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            主标签页
          </Badge>
        )}

        <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />

        {/* 主题切换 */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">主题</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

