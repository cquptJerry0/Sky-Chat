/**
 * JWT 签名和验证
 * 
 * 使用 jose 库（Next.js 推荐）
 */

import * as jose from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export interface JWTPayload {
  userId: string
}

/**
 * 签发 JWT Token
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new jose.SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * 验证 JWT Token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, secret)
    return { userId: payload.userId as string }
  } catch (error) {
    throw new Error('Invalid token')
  }
}

