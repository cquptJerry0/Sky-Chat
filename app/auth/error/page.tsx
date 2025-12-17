'use client'

/**
 * Auth Error Page - 认证错误页面
 */

import { useSearchParams } from 'next/navigation'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-medium text-foreground">登录失败</h1>
        <p className="text-muted-foreground">
          {error === 'OAuthAccountNotLinked' && '该邮箱已被其他登录方式使用'}
          {error === 'Configuration' && '服务配置错误，请联系管理员'}
          {error === 'AccessDenied' && '访问被拒绝'}
          {error === 'Verification' && '验证链接已过期或无效'}
          {!error && '发生未知错误'}
          {error && !['OAuthAccountNotLinked', 'Configuration', 'AccessDenied', 'Verification'].includes(error) && `错误: ${error}`}
        </p>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          关闭窗口
        </button>
      </div>
    </div>
  )
}
