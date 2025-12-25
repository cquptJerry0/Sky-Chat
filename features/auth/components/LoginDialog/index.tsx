'use client'

/**
 * Login Dialog Component - 登录对话框
 * 
 * 用户认证界面：
 * - OAuth2登录（Google、GitHub）
 * - 邮箱/密码登录（备选）
 */

import React, { useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { OAuth2Login } from './OAuth2Login'
import { signIn } from 'next-auth/react'

interface LoginDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function LoginDialog({ open, onOpenChange, onSuccess }: LoginDialogProps) {
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast({
        title: '请填写完整信息',
        description: '所有字段不能为空',
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: '密码不匹配',
        description: '两次输入的密码不一致',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: '密码太短',
        description: '密码至少需要6个字符',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '注册失败')
      }

      toast({
        title: '注册成功',
        description: '正在登录...',
      })

      // 注册成功后自动登录
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error('登录失败，请手动登录')
      }

      // 调用成功回调或刷新页面
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败'
      toast({
        title: '注册失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: '请填写完整信息',
        description: '邮箱和密码不能为空',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      
      if (result?.error) {
        throw new Error('邮箱或密码错误')
      }
      
      toast({
        title: '登录成功',
        description: '欢迎回来！',
      })
      
      // 调用成功回调或刷新页面
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败'
      toast({
        title: '登录失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange || (() => {})}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e: Event) => onOpenChange ? undefined : e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => onOpenChange ? undefined : e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Sky Chat</DialogTitle>
          <DialogDescription className="text-center">
            请登录以继续使用
          </DialogDescription>
          <p className="text-xs text-center text-muted-foreground mt-1">
            首次登录将自动创建账号
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {!showEmailLogin ? (
            <>
              {/* OAuth2 登录 */}
              <OAuth2Login onSuccess={onSuccess} />
              
              {/* 分隔线 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    或
                  </span>
                </div>
              </div>
              
              {/* 邮箱登录切换 */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowEmailLogin(true)}
              >
                使用邮箱登录
              </Button>
            </>
          ) : (
            <>
              {/* 邮箱登录/注册表单 */}
              <form onSubmit={isRegisterMode ? handleRegister : handleEmailLogin} className="space-y-4">
                {isRegisterMode && (
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      昵称
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="请输入昵称"
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    邮箱
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    密码
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegisterMode ? "至少6个字符" : "请输入密码"}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {isRegisterMode && (
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      确认密码
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isRegisterMode ? '注册中...' : '登录中...'}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      {isRegisterMode ? '注册' : '登录'}
                    </>
                  )}
                </Button>

                {/* 切换登录/注册模式 */}
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode)
                      setConfirmPassword('')
                      setName('')
                    }}
                    className="text-primary hover:underline"
                    disabled={isLoading}
                  >
                    {isRegisterMode ? '已有账号？点击登录' : '没有账号？点击注册'}
                  </button>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowEmailLogin(false)
                    setIsRegisterMode(false)
                    setEmail('')
                    setPassword('')
                    setConfirmPassword('')
                    setName('')
                  }}
                >
                  返回
                </Button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

