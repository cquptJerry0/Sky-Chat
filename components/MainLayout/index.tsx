/**
 * Main Layout Component - 主布局组件
 *
 * 提供标准的聊天页面布局：
 * - 侧边栏
 * - 主内容区
 * - 首次加载时的 loading 遮罩
 * - Monitor 会话管理
 *
 * @module components/MainLayout
 */

import { useState, useEffect, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { MonitorProvider } from '@/lib/monitor/MonitorProvider'

interface MainLayoutProps {
  /** 侧边栏内容 */
  sidebar: ReactNode
  /** Header 组件 */
  header?: ReactNode
  /** 主内容区（消息列表 + 输入框） */
  children: ReactNode
}

/**
 * 主布局组件
 *
 * 用于所有聊天相关页面的统一布局
 */
export function MainLayout({ sidebar, header, children }: MainLayoutProps) {
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  // 首次渲染后隐藏 loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFirstLoad(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <MonitorProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* 侧边栏 */}
        {sidebar}

        {/* 主内容区 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          {header}

          {/* 内容区域（消息列表 + 输入框） */}
          <div className="flex flex-1 flex-col overflow-hidden relative">
            {children}

            {/* 首次加载时的 loading 遮罩 */}
            {isFirstLoad && (
              <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background))] z-50">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-base">加载中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MonitorProvider>
  )
}

