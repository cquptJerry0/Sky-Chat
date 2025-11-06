/**
 * 单个会话 API
 * GET /api/conversations/[id] - 获取会话详情
 * PATCH /api/conversations/[id] - 更新会话（如标题）
 * DELETE /api/conversations/[id] - 删除会话
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { z } from 'zod'

const updateConversationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    const conversation = await ConversationRepository.findById(id, userId)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Get conversation error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params
    const body = await req.json()
    const { title } = updateConversationSchema.parse(body)

    const success = await ConversationRepository.updateTitle(id, userId, title)

    if (!success) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Update conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    const success = await ConversationRepository.delete(id, userId)

    if (!success) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

