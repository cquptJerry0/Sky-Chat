/**
 * 会话消息列表 API
 * GET /api/conversations/[id]/messages - 获取会话的所有消息
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { MessageRepository } from '@/server/repositories/message.repository'

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

    const messages = await MessageRepository.findByConversationId(id)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

