/**
 * 认证工具函数
 * 
 * 从请求中获取当前用户信息
 */

import { cookies } from 'next/headers'
import { verifyJWT } from './jwt'

/**
 * 从 Cookie 获取当前用户 ID
 * 
 * @throws Error 如果未认证或 token 无效
 */
export async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) {
    throw new Error('Unauthorized')
  }

  try {
    const payload = await verifyJWT(token)
    return payload.userId
  } catch {
    throw new Error('Invalid token')
  }
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

