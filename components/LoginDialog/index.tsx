'use client'

/**
 * Login Dialog Component - 登录对话框
 * 
 * 用户认证界面：
 * - 用户名/密码输入
 * - 错误提示
 * - 登录按钮
 */

import * as React from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface LoginDialogProps {
  open: boolean
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: '请填写完整信息',
        description: '用户名和密码不能为空',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await onLogin(username, password)
      toast({
        title: '登录成功',
        description: '欢迎回来！',
      })
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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e: Event) => e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Sky Chat</DialogTitle>
          <DialogDescription className="text-center">
            请登录以继续使用
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
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
              placeholder="请输入密码"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                登录
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            测试账号：admin / admin
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}

