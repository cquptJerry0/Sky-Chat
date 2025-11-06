/**
 * 会话分享 API
 * POST /api/conversations/[id]/share - 生成分享链接
 * DELETE /api/conversations/[id]/share - 取消分享
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { prisma } from '@/server/db/client'
import { randomBytes } from 'crypto'

/**
 * 生成分享链接
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    let shareToken = conversation.shareToken
    if (!shareToken) {
      shareToken = randomBytes(16).toString('hex')
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        shareToken,
        isShared: true,
        sharedAt: new Date(),
      },
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareToken}`

    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
      sharedAt: updatedConversation.sharedAt,
    })
  } catch (error) {
    console.error('Share conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 取消分享
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    await prisma.conversation.update({
      where: { id },
      data: {
        isShared: false,
        sharedAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unshare conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

