/**
 * 用户 API Key 管理
 * PATCH /api/user/api-key - 更新用户的 API Key
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { prisma } from '@/server/db/client'
import { z } from 'zod'

const updateApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
})

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { apiKey } = updateApiKeySchema.parse(body)

    await prisma.user.update({
      where: { id: userId },
      data: { apiKey },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Update API Key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

