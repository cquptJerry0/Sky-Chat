'use client'

/**
 * OAuth Popup Hook - 弹窗 OAuth 登录
 * 
 * 1. 弹窗中调用 signIn() 跳转到 OAuth provider
 * 2. 登录成功后弹窗页面 postMessage 通知父窗口
 * 3. 弹窗自动关闭
 */

import { useCallback, useRef, useState } from 'react'

interface UseOAuthPopupOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useOAuthPopup(options: UseOAuthPopupOptions = {}) {
  const { onSuccess, onError } = options
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (messageHandlerRef.current) {
      window.removeEventListener('message', messageHandlerRef.current)
      messageHandlerRef.current = null
    }
    setIsLoading(null)
  }, [])

  const openPopup = useCallback((provider: 'google' | 'github') => {
    setIsLoading(provider)

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const url = `/auth/popup/${provider}`

    popupRef.current = window.open(
      url,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )

    if (!popupRef.current) {
      cleanup()
      onError?.('弹窗被阻止，请允许弹窗')
      return
    }

    // 监听 postMessage
    messageHandlerRef.current = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'oauth-success') {
        cleanup()
        onSuccess?.()
      } else if (event.data?.type === 'oauth-cancelled') {
        // 用户取消了 OAuth 登录
        cleanup()
        // 不调用 onError，因为取消是正常行为
      }
    }
    window.addEventListener('message', messageHandlerRef.current)

    // 检测弹窗被手动关闭（未完成登录）
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        cleanup()
      }
    }, 0)
  }, [cleanup, onSuccess, onError])

  return { openPopup, isLoading }
}
