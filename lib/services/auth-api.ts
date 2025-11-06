/**
 * Auth API Service
 * 
 * 认证相关的API调用封装
 */

export interface User {
  id: string
  username: string
  createdAt: string
}

export const AuthAPI = {
  /**
   * 登录
   */
  async login(username: string, password: string): Promise<{ user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Login failed')
    }
    
    return res.json()
  },
  
  /**
   * 登出
   */
  async logout(): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Logout failed')
    }
    
    return res.json()
  },
  
  /**
   * 获取当前用户信息
   */
  async me(): Promise<{ user: User }> {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch user info')
    }
    
    return res.json()
  },
  
  /**
   * 更新API Key
   */
  async updateApiKey(apiKey: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/user/api-key', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update API key')
    }
    
    return res.json()
  },
}

