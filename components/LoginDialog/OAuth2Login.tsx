'use client'

/**
 * OAuth2 Login Buttons Component
 * 
 * 提供OAuth2登录按钮（Google、GitHub）
 * - Google 按钮使用官方蓝色
 * - GitHub 按钮使用官方黑色
 * - 首次登录自动创建账号（无需单独注册）
 */

import * as React from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export function OAuth2Login() {
  const [isLoading, setIsLoading] = React.useState<string | null>(null)
  const { toast } = useToast()

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(provider)
    
    try {
      await signIn(provider, {
        callbackUrl: '/',
        redirect: true,
      })
    } catch (error) {
      console.error(`${provider} sign in error:`, error)
      toast({
        title: '登录失败',
        description: '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Google 登录按钮 - 使用官方白色样式 */}
      <Button
        type="button"
        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium"
        onClick={() => handleOAuthSignIn('google')}
        disabled={!!isLoading}
      >
        {isLoading === 'google' ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
        )}
        使用 Google 登录
      </Button>

      {/* GitHub 登录按钮 - 使用官方黑色 #24292f */}
      <Button
        type="button"
        className="w-full bg-[#24292f] hover:bg-[#1b1f23] text-white"
        onClick={() => handleOAuthSignIn('github')}
        disabled={!!isLoading}
      >
        {isLoading === 'github' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" fill="white" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        )}
        使用 GitHub 登录
      </Button>
    </div>
  )
}

