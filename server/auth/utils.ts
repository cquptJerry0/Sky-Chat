/**
 * 认证工具函数
 * 
 * 支持两套并行的认证机制：
 * 1. NextAuth.js v4 (OAuth2 + Credentials) - 优先
 * 2. 传统 JWT token (向后兼容) - 备选
 */

import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { verifyJWT } from './jwt'

/**
 * 获取当前用户 ID（支持双认证机制）
 * 
 * @throws Error 如果未认证
 */
export async function getCurrentUserId(): Promise<string> {
  // 方案1: 尝试从 NextAuth session 获取（优先）
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      return session.user.id
    }
  } catch {
    // NextAuth 失败时继续尝试旧的 JWT token
  }

  // 方案2: 尝试从传统 JWT token 获取（向后兼容）
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (token) {
      const payload = await verifyJWT(token)
      return payload.userId
    }
  } catch {
    // JWT token 验证失败
  }

  // 两种方案都失败
  throw new Error('Unauthorized')
}

/**
 * 尝试获取当前用户 ID（不抛出异常）
 * 
 * @returns userId 或 null
 */
export async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    return await getCurrentUserId()
  } catch {
    return null
  }
}
