'use client'

/**
 * OAuth Success Page - 登录成功页面
 * 
 * 通过 postMessage 通知父窗口，然后自动关闭
 */

import { useRef } from 'react'

export default function OAuthSuccessPage() {
  const sent = useRef(false)

  if (!sent.current && typeof window !== 'undefined' && window.opener) {
    sent.current = true
    window.opener.postMessage({ type: 'oauth-success' }, window.location.origin)
    window.close()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">登录成功，正在关闭...</p>
      </div>
    </div>
  )
}
