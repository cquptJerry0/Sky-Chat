'use client'

/**
 * Auth SignIn Page - OAuth 取消后的重定向页面
 * 
 * 当用户在 OAuth Provider 点击取消时，会重定向到这里
 * 检测是否在弹窗中，如果是则通知父窗口并关闭
 */

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthSignInPage() {
  const searchParams = useSearchParams()
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const callbackUrl = searchParams.get('callbackUrl')
    const error = searchParams.get('error')
    const isOAuthPopup = sessionStorage.getItem('oauth-popup') === 'true'

    // 如果是 OAuth 弹窗（通过 sessionStorage 标记或 window.opener 检测）
    if (isOAuthPopup || window.opener) {
      setIsClosing(true)
      sessionStorage.removeItem('oauth-popup')

      // 通知父窗口
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: 'oauth-cancelled', error: error || 'cancelled' },
            window.location.origin
          )
        } catch {
          // opener 可能已关闭
        }
      }

      // 关闭弹窗
      window.close()
      return
    }

    // 如果不是弹窗，重定向到首页（正常访问 /auth/signin 的情况）
    if (!callbackUrl && !error) {
      window.location.href = '/'
    }
  }, [searchParams])

  // 弹窗关闭中
  if (isClosing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">正在关闭...</p>
        </div>
      </div>
    )
  }

  // 非弹窗访问，显示重定向提示
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">正在跳转...</p>
      </div>
    </div>
  )
}
