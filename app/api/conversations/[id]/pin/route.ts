/**
 * 会话置顶 API
 * PATCH /api/conversations/[id]/pin - 置顶/取消置顶会话
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { z } from 'zod'

const togglePinSchema = z.object({
  isPinned: z.boolean(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params
    const body = await req.json()
    const { isPinned } = togglePinSchema.parse(body)

    // 验证会话所有权
    const conversation = await ConversationRepository.findById(id)
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // 更新置顶状态
    const updatedConversation = await ConversationRepository.togglePin(id, isPinned)

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Toggle pin conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

