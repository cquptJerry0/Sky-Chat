/**
 * Loading Component - 加载组件
 * 
 * 提供统一的加载状态显示
 * - 屏幕中心居中
 * - 可自定义文本
 * 
 * @module components/Loading
 */

import { Loader2 } from 'lucide-react'

interface LoadingProps {
  /** 加载文本 */
  text?: string
  /** 是否显示加载图标 */
  showIcon?: boolean
}

/**
 * 加载组件
 * 
 * 用于显示加载状态
 */
export function Loading({ text = '加载中...', showIcon = true }: LoadingProps) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        {showIcon && (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        )}
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

