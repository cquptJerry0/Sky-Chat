/**
 * Main Layout Component - 主布局组件
 * 
 * 提供标准的聊天页面布局：
 * - 侧边栏
 * - 主内容区
 * 
 * @module components/MainLayout
 */

import * as React from 'react'

interface MainLayoutProps {
  /** 侧边栏内容 */
  sidebar: React.ReactNode
  /** 主内容区 */
  children: React.ReactNode
}

/**
 * 主布局组件
 * 
 * 用于所有聊天相关页面的统一布局
 */
export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 侧边栏 */}
      {sidebar}
      
      {/* 主内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

