/**
 * useAuth Hook - 认证状态管理
 * 
 * 基于NextAuth.js的认证状态管理：
 * - 使用useSession获取登录状态
 * - 自动显示/隐藏登录对话框
 * - 提供登出方法
 */

import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'

interface User {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

interface AuthState {
  /** 是否已登录 */
  isAuthenticated: boolean
  /** 当前用户信息 */
  user: User | null
  /** 是否正在检查登录状态 */
  isLoading: boolean
  /** 是否显示登录对话框 */
  showLoginDialog: boolean
  /** 登出方法 */
  logout: () => Promise<void>
}

export function useAuth(): AuthState {
  const { data: session, status } = useSession()
  
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const showLoginDialog = status === 'unauthenticated'
  
  const user = session?.user ? {
    id: session.user.id || '',
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  } : null

  // 登出
  const logout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    showLoginDialog,
    logout,
  }
}

