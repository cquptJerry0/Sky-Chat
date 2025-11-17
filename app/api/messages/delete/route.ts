/**
 * 批量删除消息 API
 * POST /api/messages/delete
 * 
 * Body:
 * - messageIds: string[] - 要删除的消息 ID 列表
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { MessageRepository } from '@/server/repositories/message.repository'
import { prisma } from '@/server/db/client'
import { audit } from '@/server/middleware/audit'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { messageIds } = await req.json()

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'messageIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // 验证所有消息都属于当前用户的会话
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
      },
      include: {
        conversation: true,
      },
    })

    // 检查权限
    const unauthorizedMessages = messages.filter(
      (msg) => msg.conversation.userId !== userId
    )

    if (unauthorizedMessages.length > 0) {
      return NextResponse.json(
        { error: 'Unauthorized to delete some messages' },
        { status: 403 }
      )
    }

    // 删除消息
    await MessageRepository.deleteMany(messageIds)

    await audit({
      userId,
      action: 'message.delete',
      resourceId: messageIds.join(','),
      request: req,
    })

    return NextResponse.json({ success: true, deletedCount: messageIds.length })
  } catch (error) {
    console.error('Delete messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

