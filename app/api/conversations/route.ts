/**
 * 会话列表 API
 * GET /api/conversations - 获取会话列表
 * POST /api/conversations - 创建新会话
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { z } from 'zod'

const createConversationSchema = z.object({
  title: z.string().optional(),
})

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const conversations = await ConversationRepository.findByUserId(userId)

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { title } = createConversationSchema.parse(body)

    const conversation = await ConversationRepository.create(
      userId,
      title || '新对话'
    )

    return NextResponse.json({ conversation })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

