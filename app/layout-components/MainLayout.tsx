'use client'

/**
 * Main Layout Component - 主布局组件
 * 
 * 管理整体页面布局：
 * - 左侧：Sidebar（动态宽度）
 * - 右侧：主内容区域
 * 
 * 响应Sidebar折叠状态调整布局
 */

import * as React from 'react'
import { useUIStore } from '@/lib/stores/ui.store'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  /** 侧边栏内容 */
  sidebar: React.ReactNode
  /** 主内容区域 */
  children: React.ReactNode
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  
  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      {sidebar}
      
      {/* 主内容区域 - 动态调整left值 */}
      <div
        className={cn(
          'flex flex-1 flex-col h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {children}
      </div>
    </div>
  )
}

