/**
 * MonitorProvider 组件
 *
 * 在应用入口初始化 Monitor，管理会话生命周期
 */

'use client'

import { useEffect, type ReactNode } from 'react'
import { getMonitor } from './index'

interface MonitorProviderProps {
  children: ReactNode
}

/**
 * Monitor 提供者组件
 * 负责启动和结束会话
 */
export function MonitorProvider({ children }: MonitorProviderProps) {
  useEffect(() => {
    // 服务端渲染时跳过
    if (typeof window === 'undefined') return

    const monitor = getMonitor()
    if (!monitor) return

    // 启动会话
    monitor.startSession()

    // 页面卸载时结束会话
    return () => {
      monitor.endSession()
    }
  }, [])

  return <>{children}</>
}
