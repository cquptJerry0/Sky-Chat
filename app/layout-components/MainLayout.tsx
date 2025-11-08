'use client'

/**
 * Main Layout Component - 主布局组件
 * 
 * 管理整体页面布局：
 * - 左侧：Sidebar（动态宽度）
 * - 右侧：主内容区域（flex-1 自动占据剩余空间）
 */

import * as React from 'react'

interface MainLayoutProps {
  /** 侧边栏内容 */
  sidebar: React.ReactNode
  /** 主内容区域 */
  children: React.ReactNode
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      {sidebar}
      
      {/* 主内容区域 - flex-1 自动占据剩余空间 */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden">
        {children}
      </div>
    </div>
  )
}

