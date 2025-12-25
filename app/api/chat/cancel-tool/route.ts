/**
 * 取消工具执行 API
 * 
 * POST /api/chat/cancel-tool
 * Body: { toolCallId: string }
 */

import { getCurrentUserId } from '@/server/auth/utils'
import { cancelToolExecution } from '@/server/services/tools/handler'

export async function POST(req: Request) {
  // 认证校验
  try {
    await getCurrentUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 解析请求体
  const body = await req.json()
  const { toolCallId } = body

  if (!toolCallId || typeof toolCallId !== 'string') {
    return Response.json({ error: 'toolCallId is required' }, { status: 400 })
  }

  // 取消任务
  const cancelled = cancelToolExecution(toolCallId)

  return Response.json({ success: cancelled })
}
