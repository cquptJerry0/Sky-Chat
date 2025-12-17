/**
 * SSE 流处理器
 * 
 * 处理 AI API 返回的流式响应，转发给客户端
 */

import { MessageRepository } from '@/server/repositories/message.repository'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { parseSSELine, splitSSEBuffer } from '@/lib/utils/sse'

export interface StreamContext {
  messageId: string
  conversationId: string
  userId: string
  sessionId: string
}

export interface StreamResult {
  thinkingContent: string
  answerContent: string
  toolCallsData: unknown | null
}

/**
 * 创建 SSE 流响应
 */
export function createSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: StreamContext
): ReadableStream {
  const { messageId, conversationId, userId, sessionId } = context
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = ''
        let thinkingContent = ''
        let answerContent = ''
        let toolCallsData = null

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            // 更新数据库中的消息
            await saveMessageContent(messageId, conversationId, userId, {
              thinkingContent,
              answerContent,
              toolCallsData,
            })

            // 发送完成信号
            sendEvent(controller, encoder, { type: 'complete', sessionId })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // 按行分割，但保留最后一行（可能不完整）
          const { lines, remaining } = splitSSEBuffer(buffer)
          buffer = remaining

          for (const line of lines) {
            const data = parseSSELine(line)
            if (!data) continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta

              // 处理 reasoning_content (thinking)
              if (delta?.reasoning_content) {
                thinkingContent += delta.reasoning_content
                sendEvent(controller, encoder, {
                  type: 'thinking',
                  content: delta.reasoning_content,
                  sessionId,
                })
              }

              // 处理 content (answer)
              if (delta?.content) {
                answerContent += delta.content
                sendEvent(controller, encoder, {
                  type: 'answer',
                  content: delta.content,
                  sessionId,
                })
              }

              // 处理 tool_calls
              if (delta?.tool_calls) {
                toolCallsData = delta.tool_calls
                sendEvent(controller, encoder, {
                  type: 'tool_calls',
                  tool_calls: delta.tool_calls,
                  sessionId,
                })
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

/**
 * 发送 SSE 事件
 */
function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: Record<string, unknown>
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
}

/**
 * 保存消息内容到数据库
 */
async function saveMessageContent(
  messageId: string,
  conversationId: string,
  userId: string,
  content: { thinkingContent: string; answerContent: string; toolCallsData: unknown | null }
): Promise<void> {
  try {
    await MessageRepository.update(messageId, {
      content: content.answerContent,
      thinking: content.thinkingContent || undefined,
      toolCalls: content.toolCallsData || undefined,
    })

    await ConversationRepository.touch(conversationId, userId)
  } catch (error) {
    console.error('[StreamHandler] Failed to save message:', error)
  }
}
