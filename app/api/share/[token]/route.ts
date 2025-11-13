/**
 * 公开分享 API（无需登录）
 * GET /api/share/[token] - 获取分享的会话内容
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const conversation = await prisma.conversation.findUnique({
      where: {
        shareToken: token,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!conversation || !conversation.isShared) {
      return NextResponse.json(
        { error: 'Shared conversation not found or no longer available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        sharedAt: conversation.sharedAt,
        author: conversation.user.username,
        messages: conversation.messages.map((msg: {
          id: string
          role: string
          content: string
          thinking: string | null
          createdAt: Date
        }) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          thinking: msg.thinking,
          createdAt: msg.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Get shared conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

