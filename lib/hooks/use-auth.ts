/**
 * useAuth Hook - 认证状态管理
 * 
 * 管理用户登录状态：
 * - 检查登录状态
 * - 自动显示/隐藏登录对话框
 * - 提供登录/登出方法
 */

import { useState, useEffect } from 'react'
import { AuthAPI, type User } from '@/lib/services/auth-api'

interface AuthState {
  /** 是否已登录 */
  isAuthenticated: boolean
  /** 当前用户信息 */
  user: User | null
  /** 是否正在检查登录状态 */
  isLoading: boolean
  /** 是否显示登录对话框 */
  showLoginDialog: boolean
  /** 登录方法 */
  login: (username: string, password: string) => Promise<void>
  /** 登出方法 */
  logout: () => Promise<void>
  /** 刷新用户信息 */
  refresh: () => Promise<void>
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  // 检查登录状态
  const checkAuth = async () => {
    try {
      const { user: userData } = await AuthAPI.me()
      setUser(userData)
      setIsAuthenticated(true)
      setShowLoginDialog(false)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
      setShowLoginDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth()
  }, [])

  // 登录
  const login = async (username: string, password: string) => {
    const { user: userData } = await AuthAPI.login(username, password)
    setUser(userData)
    setIsAuthenticated(true)
    setShowLoginDialog(false)
  }

  // 登出
  const logout = async () => {
    await AuthAPI.logout()
    setUser(null)
    setIsAuthenticated(false)
    setShowLoginDialog(true)
  }

  // 刷新用户信息
  const refresh = async () => {
    await checkAuth()
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    showLoginDialog,
    login,
    logout,
    refresh,
  }
}

