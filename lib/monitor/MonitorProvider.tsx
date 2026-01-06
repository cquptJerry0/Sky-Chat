/**
 * MonitorProvider 组件
 *
 * 在应用入口初始化 Monitor，管理会话生命周期
 */

'use client'

import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react'
import { getMonitor } from './index'
import { useDebugSubscription } from './debug/hooks'

// 懒加载 DebugPanel（仅开发环境）
const DebugPanel = lazy(() =>
  import('./debug/DebugPanel').then((m) => ({ default: m.DebugPanel }))
)

interface MonitorProviderProps {
  children: ReactNode
}

const isDev = process.env.NODE_ENV === 'development'

/**
 * Monitor 提供者组件
 * 负责启动和结束会话
 */
export function MonitorProvider({ children }: MonitorProviderProps) {
  const [isClient, setIsClient] = useState(false)

  // 开发环境：使用 hook 订阅 DebugPlugin 事件
  // 注意：Hook 必须无条件调用，但内部逻辑会根据 isDev 决定是否真正订阅
  const debugState = useDebugSubscription()
  const { status, error } = isDev
    ? debugState
    : { status: 'connected' as const, error: null }

  useEffect(() => {
    setIsClient(true)

    // 服务端渲染时跳过
    if (typeof window === 'undefined') return

    try {
      const monitor = getMonitor()
      if (!monitor) return

      // 启动会话
      monitor.startSession()

      // 页面卸载时结束会话
      return () => {
        try {
          monitor.endSession()
        } catch (e) {
          console.warn('[Monitor] endSession error:', e)
        }
      }
    } catch (e) {
      console.warn('[Monitor] init error:', e)
    }
  }, [])

  return (
    <>
      {children}
      {/* 开发环境显示调试面板 */}
      {isDev && isClient && (
        <Suspense fallback={null}>
          <DebugPanel connectionStatus={status} connectionError={error} />
        </Suspense>
      )}
    </>
  )
}
