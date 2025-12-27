/**
 * Message API - 更新消息内容
 *
 * PATCH /api/message/[messageId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { MessageRepository } from '@/server/repositories/message.repository'
import { getCurrentUserId } from '@/server/auth/utils'

interface PatchRequest {
  content?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
): Promise<NextResponse> {
  // 鉴权
  try {
    await getCurrentUserId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { messageId } = await params
    const body = (await request.json()) as PatchRequest

    if (!body.content) {
      return NextResponse.json(
        { error: '缺少 content 参数' },
        { status: 400 }
      )
    }

    await MessageRepository.update(messageId, {
      content: body.content,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Message PATCH] Error:', error)
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    )
  }
}
