'use client'

/**
 * AuthGuard Component - 认证守卫组件
 * 
 * 统一处理页面级别的认证逻辑：
 * - 自动显示加载状态
 * - 未登录时显示登录对话框
 * - 可选择未登录时的行为（重定向或仅显示对话框）
 * 
 * @module components/AuthGuard
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { LoginDialog } from '@/components/LoginDialog'

interface AuthGuardProps {
  /** 子组件 */
  children: React.ReactNode
  /** 未登录时是否重定向到指定路径 */
  redirectTo?: string | null
  /** 加载状态时显示的文本 */
  loadingText?: string
  /** 未登录时显示的文本 */
  unauthenticatedText?: string
  /** 是否显示加载动画 */
  showLoader?: boolean
}

/**
 * 认证守卫组件
 * 
 * @example
 * ```tsx
 * // 基础用法：未登录时显示登录对话框
 * <AuthGuard>
 *   <YourProtectedContent />
 * </AuthGuard>
 * 
 * // 未登录时重定向到首页
 * <AuthGuard redirectTo="/">
 *   <YourProtectedContent />
 * </AuthGuard>
 * 
 * // 自定义文本
 * <AuthGuard 
 *   loadingText="验证身份中..." 
 *   unauthenticatedText="请登录以继续"
 * >
 *   <YourProtectedContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  redirectTo = null,
  loadingText = '加载中...',
  unauthenticatedText = '请先登录...',
  showLoader = true,
}: AuthGuardProps) {
  const router = useRouter()
  const { isLoading, isAuthenticated, showLoginDialog } = useAuth()
  const [hasRedirected, setHasRedirected] = React.useState(false)

  // 处理未登录时的重定向
  React.useEffect(() => {
    // 等待认证完成
    if (isLoading) return

    // 已登录，清除重定向标记
    if (isAuthenticated) {
      setHasRedirected(false)
      return
    }

    // 未登录且需要重定向
    if (!isAuthenticated && redirectTo && !hasRedirected) {
      console.log(`[AuthGuard] User not authenticated, redirecting to ${redirectTo}`)
      setHasRedirected(true)
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, redirectTo, hasRedirected, router])

  // 正在加载认证状态
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          {showLoader && (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          )}
          <p className="text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    )
  }

  // 未登录
  if (!isAuthenticated) {
    // 如果设置了重定向，显示重定向中的加载状态
    if (redirectTo) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            {showLoader && (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            )}
            <p className="text-muted-foreground">{unauthenticatedText}</p>
          </div>
        </div>
      )
    }

    // 没有设置重定向，显示登录对话框并保持当前页面
    return (
      <>
        <LoginDialog open={showLoginDialog} />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            {showLoader && (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            )}
            <p className="text-muted-foreground">{unauthenticatedText}</p>
          </div>
        </div>
      </>
    )
  }

  // 已登录，渲染子组件
  return (
    <>
      <LoginDialog open={showLoginDialog} />
      {children}
    </>
  )
}

