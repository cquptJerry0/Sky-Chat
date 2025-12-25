/**
 * SSE 流处理器
 * 
 * 处理 AI API 返回的流式响应，转发给客户端
 */

import { parseSSELine, splitSSEBuffer } from '@/lib/utils/sse'
import { createChatCompletion } from '@/server/services/ai/siliconflow'
import { toolRegistry, type ToolCall } from '@/server/services/tools'
import { formatToolMessages } from '@/server/services/tools/handler'
import { SSEWriter, type ToolResultData } from './sse-writer'
import { executeTools, waitForAllSlowTasks } from './tool-orchestrator'
import { persistMessage, processImageResults } from './message-persister'

export interface StreamContext {
  messageId: string
  conversationId: string
  userId: string
  sessionId: string
}

type ChatMessage = {
  role: string
  content: string | null
  tool_calls?: ToolCall[]
}

export interface StreamContextWithTools extends StreamContext {
  apiKey: string
  model: string
  contextMessages: ChatMessage[]
  enableThinking: boolean
  thinkingBudget: number
}

/** 最大工具调用轮数（防止无限循环） */
const MAX_TOOL_ROUNDS = 5

/**
 * 创建支持工具调用的 SSE 流响应
 */
export function createSSEStreamWithTools(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: StreamContextWithTools
): ReadableStream {
  const {
    messageId,
    conversationId,
    userId,
    sessionId,
    apiKey,
    model,
    contextMessages,
    enableThinking,
    thinkingBudget,
  } = context
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const writer = new SSEWriter(controller, encoder, sessionId)

      try {
        let thinkingContent = ''
        let finalAnswerContent = ''
        const allToolCalls: ToolCall[] = []
        const allToolResultsData: ToolResultData[] = []

        let currentMessages = [...contextMessages]
        let currentReader = reader
        let round = 0

        // 工具调用循环
        while (round < MAX_TOOL_ROUNDS) {
          round++

          // 读取当前轮次的 AI 响应
          const {
            thinkingContent: roundThinking,
            answerContent: roundAnswer,
            toolCalls: roundToolCalls,
          } = await processAIResponse(currentReader, decoder, writer)

          thinkingContent += roundThinking

          // 没有工具调用，这是最终回答
          if (roundToolCalls.length === 0) {
            finalAnswerContent = roundAnswer
            break
          }

          // 有工具调用，执行它们
          allToolCalls.push(...roundToolCalls)

          // 发送工具调用开始事件
          for (const tc of roundToolCalls) {
            writer.sendToolCall(tc)
          }

          // 执行工具
          const { fastResults, pendingSlowTasks } = await executeTools(
            roundToolCalls,
            writer
          )
          allToolResultsData.push(...fastResults)

          // 等待慢速工具完成
          const slowResults = await waitForAllSlowTasks(pendingSlowTasks, writer)
          allToolResultsData.push(...slowResults)

          // 构建下一轮请求的消息
          const toolResults = allToolResultsData.map((r) => ({
            toolCallId: r.toolCallId,
            name: r.name,
            success: r.result.success,
            content: JSON.stringify(r.result),
          }))
          const toolMessages = formatToolMessages(toolResults)
          currentMessages = [
            ...currentMessages,
            {
              role: 'assistant',
              content: roundAnswer || null,
              tool_calls: roundToolCalls,
            } as ChatMessage,
            ...(toolMessages as ChatMessage[]),
          ]

          // 发起下一轮 AI 请求
          const { reader: nextReader } = await createChatCompletion(apiKey, {
            model,
            messages: currentMessages as Array<{
              role: 'system' | 'user' | 'assistant'
              content: string
            }>,
            enableThinking,
            thinkingBudget,
            tools: toolRegistry.getToolDefinitions(),
          })

          currentReader = nextReader
        }

        // 处理图片结果
        const contentWithImages = processImageResults(
          finalAnswerContent,
          allToolCalls,
          allToolResultsData
        )

        // 保存最终内容
        await persistMessage(messageId, conversationId, userId, {
          thinkingContent,
          answerContent: contentWithImages,
          toolCallsData: allToolCalls.length > 0 ? allToolCalls : null,
          toolResultsData:
            allToolResultsData.length > 0 ? allToolResultsData : null,
        })

        // 发送完成信号
        writer.sendComplete()
        writer.close()
      } catch (error) {
        console.error('[StreamHandler] Error in tool stream:', error)
        writer.error(error)
      }
    },
  })
}

/**
 * 处理单轮 AI 响应
 */
async function processAIResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  writer: SSEWriter
): Promise<{
  thinkingContent: string
  answerContent: string
  toolCalls: ToolCall[]
}> {
  let buffer = ''
  let thinkingContent = ''
  let answerContent = ''
  const toolCallsChunks: Array<{
    index: number
    id?: string
    type?: string
    function?: { name?: string; arguments?: string }
  }> = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    buffer += chunk

    const { lines, remaining } = splitSSEBuffer(buffer)
    buffer = remaining

    for (const line of lines) {
      const data = parseSSELine(line)
      if (!data) continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta

        if (delta?.reasoning_content) {
          thinkingContent += delta.reasoning_content
          writer.sendThinking(delta.reasoning_content)
        }

        if (delta?.content) {
          answerContent += delta.content
          writer.sendAnswer(delta.content)
        }

        // 收集 tool_calls 片段
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            if (!toolCallsChunks[idx]) {
              toolCallsChunks[idx] = { index: idx }
            }
            if (tc.id) toolCallsChunks[idx].id = tc.id
            if (tc.type) toolCallsChunks[idx].type = tc.type
            if (tc.function) {
              if (!toolCallsChunks[idx].function) {
                toolCallsChunks[idx].function = {}
              }
              if (tc.function.name) {
                toolCallsChunks[idx].function!.name = tc.function.name
              }
              if (tc.function.arguments) {
                toolCallsChunks[idx].function!.arguments =
                  (toolCallsChunks[idx].function!.arguments || '') +
                  tc.function.arguments
              }
            }
          }
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  // 构建完整的 tool_calls
  const toolCalls: ToolCall[] = toolCallsChunks
    .filter((tc) => tc.id && tc.function?.name)
    .map((tc) => ({
      id: tc.id!,
      type: 'function' as const,
      function: {
        name: tc.function!.name!,
        arguments: tc.function!.arguments || '{}',
      },
    }))

  return { thinkingContent, answerContent, toolCalls }
}

/**
 * 创建基础 SSE 流响应（无工具调用）
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
      const writer = new SSEWriter(controller, encoder, sessionId)

      try {
        let buffer = ''
        let thinkingContent = ''
        let answerContent = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            await persistMessage(messageId, conversationId, userId, {
              thinkingContent,
              answerContent,
              toolCallsData: null,
            })
            writer.sendComplete()
            writer.close()
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          const { lines, remaining } = splitSSEBuffer(buffer)
          buffer = remaining

          for (const line of lines) {
            const data = parseSSELine(line)
            if (!data) continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta

              if (delta?.reasoning_content) {
                thinkingContent += delta.reasoning_content
                writer.sendThinking(delta.reasoning_content)
              }

              if (delta?.content) {
                answerContent += delta.content
                writer.sendAnswer(delta.content)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      } catch (error) {
        writer.error(error)
      }
    },
  })
}
