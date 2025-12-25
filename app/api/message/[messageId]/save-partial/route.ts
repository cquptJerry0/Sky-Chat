/**
 * 保存部分消息 API
 * 
 * 用于用户中断流时保存已接收的内容
 * POST /api/message/[messageId]/save-partial
 */

import { getCurrentUserId } from '@/server/auth/utils'
import { MessageRepository } from '@/server/repositories/message.repository'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    await getCurrentUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId } = await params
  const body = await req.json()
  const { content, thinking, toolInvocations } = body

  try {
    await MessageRepository.update(messageId, {
      content: content || '',
      thinking: thinking || undefined,
      toolCalls: toolInvocations?.length
        ? toolInvocations.map((inv: { toolCallId: string; name: string; args?: object }) => ({
            id: inv.toolCallId,
            type: 'function',
            function: { name: inv.name, arguments: JSON.stringify(inv.args || {}) },
          }))
        : undefined,
      toolResults: toolInvocations?.length
        ? toolInvocations
            .filter((inv: { state: string }) => inv.state !== 'running')
            .map((inv: { toolCallId: string; name: string; state: string; result?: object }) => ({
              toolCallId: inv.toolCallId,
              name: inv.name,
              result: {
                success: inv.state === 'completed',
                cancelled: inv.state === 'cancelled',
                ...inv.result,
              },
            }))
        : undefined,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[SavePartial] Failed:', error)
    return Response.json({ error: 'Failed to save' }, { status: 500 })
  }
}
