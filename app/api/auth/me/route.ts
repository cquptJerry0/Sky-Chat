/**
 * 获取当前用户信息 API
 * GET /api/auth/me
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { UserRepository } from '@/server/repositories/user.repository'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const user = await UserRepository.findById(userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

