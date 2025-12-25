'use client'

/**
 * Share Page Overlay - 分享页登录引导组件
 * 
 * 触发方式：
 * 1. 点击页面任意位置（Dialog 关闭状态下）
 * 2. 延迟 5 秒后自动弹出
 * 
 * 副作用考虑：
 * - Dialog 打开时不监听点击，避免关闭按钮的 click 冒泡导致立即重新打开
 * - 关闭后有 300ms 冷却时间，避免关闭动画期间的点击误触发
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LoginDialog } from '@/features/auth/components/LoginDialog'

interface SharePageOverlayProps {
  conversationId: string
  /** 延迟弹出时间（毫秒），默认 5000ms */
  delayMs?: number
}

export function SharePageOverlay({ conversationId, delayMs = 5000 }: SharePageOverlayProps) {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownRef = useRef(false) // 冷却状态，防止关闭后立即重新打开
  
  // 触发登录弹窗
  const triggerLogin = () => {
    if (showLogin || cooldownRef.current) return
    setShowLogin(true)
  }
  
  // 启动延迟定时器
  const startDelayTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(triggerLogin, delayMs)
  }
  
  // 初始延迟触发
  useEffect(() => {
    startDelayTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // 点击触发（仅在 Dialog 关闭且不在冷却期时）
  useEffect(() => {
    if (showLogin) return // Dialog 打开时不监听
    
    const handleClick = () => {
      if (!cooldownRef.current) {
        triggerLogin()
      }
    }
    
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showLogin]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // 关闭后重新启动定时器，并设置冷却期
  const handleOpenChange = (open: boolean) => {
    setShowLogin(open)
    if (!open) {
      // 设置 300ms 冷却期，避免关闭动画期间的点击误触发
      cooldownRef.current = true
      setTimeout(() => {
        cooldownRef.current = false
      }, 300)
      
      // 关闭后重新开始计时
      startDelayTimer()
    }
  }
  
  const handleLoginSuccess = () => {
    router.push(`/chat?ref=${conversationId}`)
  }
  
  return (
    <LoginDialog 
      open={showLogin}
      onOpenChange={handleOpenChange}
      onSuccess={handleLoginSuccess}
    />
  )
}
