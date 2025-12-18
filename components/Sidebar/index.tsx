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
 * - 底部：主标签页指示器
 */

import * as React from 'react'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUIStore } from '@/lib/stores/ui.store'
import { cn } from '@/lib/utils'
import { SkyLogoIcon } from '@/components/icons/SkyLogo'

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
        'overflow-x-hidden',  // 关键：隐藏水平滚动条
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* 顶部：Logo和折叠按钮 */}
      <div className={cn(
        "p-3",
        collapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between px-4"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          collapsed && "justify-center"
        )}>
          <SkyLogoIcon width={32} height={32} className="shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-lg whitespace-nowrap bg-gradient-to-r from-[#60A5FA] to-[#2563EB] bg-clip-text text-transparent">
              Sky Chat
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 hover:bg-[hsl(var(--sidebar-hover))] shrink-0"
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* 中间：动态内容（会话列表等模块） */}
      {!collapsed && (
        <ScrollArea className="flex-1 min-h-0 px-3">
          {children}
        </ScrollArea>
      )}

      {/* 底部：主标签页指示器 */}
      <div className="p-3 mt-auto">
        {/* Leader 状态指示 */}
        {isLeader && (
          <Badge
            variant="outline"
            className={cn(
              "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 w-full justify-center",
              collapsed ? "px-1" : ""
            )}
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {!collapsed && <span className="ml-2">主标签页</span>}
          </Badge>
        )}
      </div>
    </aside>
  )
}

