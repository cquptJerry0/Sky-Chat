'use client'

/**
 * Landing Input Component - 落地页输入区域（CSR）
 * 
 * Client Component - 处理用户交互
 * - 消息输入
 * - 发送按钮
 * - 登录对话框触发
 * 
 * @module components/LandingPage/LandingInput
 */

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoginDialog } from '@/features/auth/components/LoginDialog'

/**
 * 输入区域组件（Client Component）
 * 
 * 处理所有交互逻辑，保持简洁风格
 */
export function LandingInput() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const pendingMessageRef = useRef('')

  /**
   * 处理发送按钮点击
   */
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage) return

    // 保存到 ref，登录成功后用
    pendingMessageRef.current = trimmedMessage
    setShowLogin(true)
  }, [message])

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <>
      {/* 输入区域 */}
      <div className="relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息开始对话..."
          autoFocus
          className="w-full px-6 py-4 pr-14 text-base rounded-2xl border-2 border-border bg-background focus:outline-none focus:border-primary transition-colors"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* 提示文字 */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        点击发送后，您需要登录或注册账号
      </p>

      {/* 登录对话框 */}
      <LoginDialog 
        open={showLogin} 
        onOpenChange={setShowLogin}
        onSuccess={() => {
          setShowLogin(false)
          // 带上 pending message 跳转
          const msg = encodeURIComponent(pendingMessageRef.current)
          router.push(`/chat?msg=${msg}`)
        }}
      />
    </>
  )
}

