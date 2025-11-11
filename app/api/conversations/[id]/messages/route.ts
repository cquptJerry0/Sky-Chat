/**
 * 会话消息列表 API
 * GET /api/conversations/[id]/messages - 获取会话的所有消息（支持分页）
 * 
 * Query 参数：
 * - limit: 每页数量（默认50）
 * - cursor: 游标消息ID
 * - direction: 'before' | 'after'（相对于游标的方向）
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
    const { searchParams } = new URL(req.url)
    
    // 解析分页参数
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const cursor = searchParams.get('cursor')
    const direction = searchParams.get('direction') as 'before' | 'after' | null

    const conversation = await ConversationRepository.findById(id, userId)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // 如果没有游标，返回最新的消息（已经是正序：旧 → 新）
    if (!cursor) {
      const messages = await MessageRepository.findByConversationId(id, limit)
      
      return NextResponse.json({
        messages,  // [1, 2, 3, ..., 50] 正序
        hasMore: messages.length === limit,
        nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,  // 最新消息（50）
        prevCursor: messages.length > 0 ? messages[0].id : null,  // 最旧消息（1）用于向上加载
      })
    }

    // 分页查询
    const messages = await MessageRepository.findPaginated(id, {
      cursor,
      direction: direction || 'before',
      limit,
    })

    return NextResponse.json({
      messages,
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
      prevCursor: messages.length > 0 ? messages[0].id : null,
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

