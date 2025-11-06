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
import { MessageSquare, PanelLeftClose, PanelLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/lib/stores/ui.store'
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
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  
  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-[hsl(var(--sidebar-bg))] dark:bg-[hsl(var(--sidebar-bg))] transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* 顶部：Logo和折叠按钮 */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between px-3 py-2">
          {!collapsed && (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 shrink-0" />
                <span className="font-semibold text-lg">Sky Chat</span>
              </div>
            </>
          )}
          {collapsed && (
            <MessageSquare className="h-5 w-5 mx-auto" />
          )}
        </div>
        
        {/* 折叠/展开按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full hover:bg-[hsl(var(--sidebar-hover))]"
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 中间：动态内容（会话列表等模块） */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3">
          {children}
        </div>
      )}

      {/* 底部：状态和设置 */}
      <div className="p-3 space-y-2 mt-auto">
        {!collapsed && (
          <>
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
          </>
        )}
        
        {/* 折叠时只显示主题切换图标 */}
        {collapsed && (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        )}
      </div>
    </aside>
  )
}

