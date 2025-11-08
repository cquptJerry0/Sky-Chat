/**
 * Chat Continue API - 断点续传API
 * 
 * 功能：
 * - 从StreamManager读取中断后收集的内容
 * - 使用RxJS模拟SSE流式传输给前端
 * - 支持多用户并发
 */

import { getCurrentUserId } from '@/server/auth/utils'
import { MessageRepository } from '@/server/repositories/message.repository'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { streamManager } from '@/server/services/stream-manager'

export async function POST(req: Request) {
  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId, conversationId } = await req.json()

  if (!messageId || !conversationId) {
    return Response.json(
      { error: 'messageId and conversationId are required' },
      { status: 400 }
    )
  }

  try {
    // 验证会话权限
    const conversation = await ConversationRepository.findById(conversationId, userId)
    if (!conversation) {
      console.error(`[Continue API] Conversation not found: ${conversationId} for user: ${userId}`)
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 查找消息
    const message = await MessageRepository.findById(messageId)
    if (!message) {
      console.error(`[Continue API] Message not found: ${messageId}`)
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }
    
    if (message.conversationId !== conversationId) {
      console.error(`[Continue API] Message ${messageId} does not belong to conversation ${conversationId}`)
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.role !== 'assistant') {
      console.error(`[Continue API] Cannot continue ${message.role} message: ${messageId}`)
      return Response.json(
        { error: 'Can only continue assistant messages' },
        { status: 400 }
      )
    }

    // 检查StreamManager中的任务
    const task = streamManager.getTask(messageId)
    
    if (!task) {
      console.warn(`[Continue API] No task found for message: ${messageId}. Content may have been fully sent or cleaned up.`)
      return Response.json(
        { error: 'No task found for this message. Content may have been fully sent.' },
        { status: 404 }
      )
    }

    if (task.status !== 'paused' && task.status !== 'running') {
      console.warn(`[Continue API] Task ${messageId} is in ${task.status} state, cannot continue`)
      return Response.json(
        { error: `Task is in ${task.status} state, cannot continue` },
        { status: 400 }
      )
    }
    
    // 验证task归属
    if (task.userId !== userId) {
      console.error(`[Continue API] User ${userId} trying to access task owned by ${task.userId}`)
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 恢复任务
    streamManager.resumeTask(messageId)

    // 获取未发送的内容
    const unsent = streamManager.getUnsentContent(messageId)
    
    // 验证是否有内容可续传
    if (!unsent.thinking && !unsent.content) {
      console.warn(`[Continue API] No unsent content for message: ${messageId}`)
      return Response.json(
        { error: 'No content to continue' },
        { status: 404 }
      )
    }
    
    console.log(`[Continue API] Resuming message: ${messageId}`, {
      unsentThinking: unsent.thinking.length,
      unsentContent: unsent.content.length
    })

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用StreamManager的模拟流，传递abort signal
          const subscription = streamManager
            .streamUnsentContent(messageId, req.signal)
            .subscribe({
              next: (chunk) => {
                const data = JSON.stringify(chunk)
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              },
              error: (error) => {
                console.error('Stream error:', error)
                streamManager.errorTask(messageId)
                const errorData = JSON.stringify({
                  type: 'error',
                  error: error.message,
                })
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                controller.close()
              },
              complete: async () => {
                try {
                  // 更新数据库中的消息
                  const finalTask = streamManager.getTask(messageId)
                  if (finalTask) {
                    const updated = await MessageRepository.update(messageId, {
                      content: finalTask.fullContent,
                      thinking: finalTask.fullThinking || undefined,
                    })
                    
                    if (!updated) {
                      console.error(`[Continue API] Message ${messageId} not found for update`)
                    } else {
                      // 更新会话时间戳
                      await ConversationRepository.touch(conversationId, userId)
                      console.log(`[Continue API] Successfully updated message: ${messageId}`)
                    }
                  }

                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                } catch (error) {
                  console.error('[Continue API] Error saving final content:', error)
                  controller.close()
                }
              },
            })

          // 监听请求取消
          req.signal.addEventListener('abort', () => {
            console.log(`[Continue API] Request aborted for message: ${messageId}`)
            subscription.unsubscribe()
            controller.close()
          })
        } catch (error) {
          console.error('[Continue API] Stream error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Message-ID': messageId,
        'X-Conversation-ID': conversationId,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Continue API error:', errorMessage)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
