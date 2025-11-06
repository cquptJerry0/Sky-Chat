'use client'

/**
 * Sidebar Layout Component - 侧边栏布局组件
 * 
 * 只负责布局和容器，不包含业务逻辑
 * 会话列表等功能模块通过children注入
 * 
 * 布局结构：
 * - 顶部：Logo和品牌
 * - 中间：children（会话列表等模块）
 * - 底部：设置和状态
 */

import * as React from 'react'
import { MessageSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SidebarProps {
  /** 子组件（如会话列表模块） */
  children?: React.ReactNode
  /** 是否为主标签页 */
  isLeader?: boolean
  /** 额外的 CSS 类名 */
  className?: string
}

export function Sidebar({ children, isLeader, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col bg-[hsl(var(--sidebar-bg))] dark:bg-[hsl(var(--sidebar-bg))]',
        className
      )}
    >
      {/* 顶部：Logo */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <MessageSquare className="h-5 w-5" />
          <span className="font-semibold text-lg">Sky Chat</span>
        </div>
      </div>

      {/* 中间：动态内容（会话列表等模块） */}
      <div className="flex-1 overflow-y-auto px-3">
        {children}
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

