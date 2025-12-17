/**
 * Main Layout Component - 主布局组件
 *
 * 提供标准的聊天页面布局：
 * - 侧边栏
 * - 主内容区
 * - 切换会话时的 loading 遮罩（不覆盖 Header）
 *
 * @module components/MainLayout
 */

import * as React from 'react'
import { useChatStore } from '@/features/chat/store/chat.store'
import { Loader2 } from 'lucide-react'

interface MainLayoutProps {
  /** 侧边栏内容 */
  sidebar: React.ReactNode
  /** Header 组件 */
  header?: React.ReactNode
  /** 主内容区（消息列表 + 输入框） */
  children: React.ReactNode
}

/**
 * 主布局组件
 *
 * 用于所有聊天相关页面的统一布局
 */
export function MainLayout({ sidebar, header, children }: MainLayoutProps) {
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 侧边栏 */}
      {sidebar}

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header（不受 loading 影响） */}
        {header}

        {/* 内容区域（消息列表 + 输入框，受 loading 影响） */}
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {children}

          {/* 加载消息时的 loading 遮罩（只覆盖消息列表和输入框） */}
          {/* 放在 children 后面确保遮罩在最上层 */}
          {isLoadingMessages && (
            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background))] z-50 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-[hsl(var(--text-secondary))]">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-base">加载中...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

