/**
 * 密码加密和验证
 * 
 * 使用 bcryptjs 进行密码哈希
 */

import bcrypt from 'bcryptjs'

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

