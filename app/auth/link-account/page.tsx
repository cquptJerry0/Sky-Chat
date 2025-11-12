'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function LinkAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const email = searchParams.get('email')
  const provider = searchParams.get('provider')
  const token = searchParams.get('token')
  
  const [isLinking, setIsLinking] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  const providerName = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : provider

  const handleConfirmLink = async () => {
    if (!token) {
      toast({
        title: '错误',
        description: '缺少确认令牌',
        variant: 'destructive',
      })
      return
    }

    setIsLinking(true)
    try {
      const res = await fetch('/api/auth/confirm-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '关联失败')
      }

      toast({
        title: '关联成功',
        description: `您的 ${providerName} 账号已成功关联`,
      })

      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '关联失败'
      toast({
        title: '关联失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLinking(false)
    }
  }

  const handleReject = async () => {
    if (!token) {
      router.push('/')
      return
    }

    setIsRejecting(true)
    try {
      await fetch('/api/auth/reject-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      toast({
        title: '已取消',
        description: '账号关联已取消',
      })

      router.push('/')
    } catch (error) {
      console.error('Failed to reject link:', error)
      router.push('/')
    } finally {
      setIsRejecting(false)
    }
  }

  if (!email || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              参数错误
            </CardTitle>
            <CardDescription>
              缺少必要的参数，请重新登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            账号关联确认
          </CardTitle>
          <CardDescription>
            检测到您的 {providerName} 账号与已存在的账号使用相同邮箱
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">邮箱地址</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">OAuth 提供商</span>
              <span className="font-medium">{providerName}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              关联后，您可以使用 {providerName} 账号登录到已存在的账号。
              所有数据和对话历史将保持不变。
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>安全提示：</strong>
                如果这不是您本人的操作，请点击"取消"并立即修改密码。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1"
              disabled={isLinking || isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  取消中...
                </>
              ) : (
                '取消'
              )}
            </Button>
            <Button
              onClick={handleConfirmLink}
              className="flex-1"
              disabled={isLinking || isRejecting}
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  关联中...
                </>
              ) : (
                '确认关联'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

