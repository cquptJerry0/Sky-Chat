/**
 * useAuth Hook - 认证状态管理
 */

import { useSession, signOut } from 'next-auth/react'

interface User {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  showLoginDialog: boolean
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
