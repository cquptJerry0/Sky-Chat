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
            // 保存内容
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
  content: {
    thinkingContent: string
    answerContent: string
    toolCallsData: unknown | null
    toolResultsData?: unknown | null
  }
): Promise<void> {
  try {
    await MessageRepository.update(messageId, {
      content: content.answerContent,
      thinking: content.thinkingContent || undefined,
      toolCalls: content.toolCallsData || undefined,
      toolResults: content.toolResultsData || undefined,
    })

    await ConversationRepository.touch(conversationId, userId)
  } catch (error) {
    console.error('[StreamHandler] Failed to save message:', error)
  }
}


import { createChatCompletion } from '@/server/services/ai/siliconflow'
import { toolRegistry, type ToolCall } from '@/server/services/tools'
import { executeToolCalls, formatToolMessages } from '@/server/services/tools/handler'

// 消息类型（支持 tool_calls）
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

/**
 * 创建支持工具调用的 SSE 流响应（支持多轮工具调用）
 */
export function createSSEStreamWithTools(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: StreamContextWithTools
): ReadableStream {
  const { messageId, conversationId, userId, sessionId, apiKey, model, contextMessages, enableThinking, thinkingBudget } = context
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  // 最大工具调用轮数（防止无限循环）
  const MAX_TOOL_ROUNDS = 5

  return new ReadableStream({
    async start(controller) {
      try {
        let thinkingContent = ''
        let finalAnswerContent = ''
        
        // 累积所有轮次的工具调用和结果
        const allToolCalls: ToolCall[] = []
        const allToolResultsData: Array<{
          toolCallId: string
          name: string
          result: { success: boolean; imageUrl?: string; prompt?: string; resultCount?: number }
        }> = []

        // 当前消息上下文（会随着工具调用不断扩展）
        let currentMessages = [...contextMessages]
        let currentReader = reader
        let round = 0

        // 工具调用循环
        while (round < MAX_TOOL_ROUNDS) {
          round++
          console.log(`[StreamHandler] Tool round ${round}`)

          // 读取当前轮次的 AI 响应
          const { 
            thinkingContent: roundThinking, 
            answerContent: roundAnswer, 
            toolCalls: roundToolCalls 
          } = await processAIResponse(currentReader, decoder, encoder, controller, sessionId)

          thinkingContent += roundThinking
          
          // 检查是否有工具调用
          if (roundToolCalls.length === 0) {
            // 没有工具调用，这是最终回答
            finalAnswerContent = roundAnswer
            break
          }

          // 有工具调用，执行它们
          allToolCalls.push(...roundToolCalls)

          // 发送工具调用开始事件
          for (const tc of roundToolCalls) {
            sendToolCallEvent(controller, encoder, tc, sessionId)
          }

          // 执行工具调用
          console.log('[StreamHandler] Executing tool calls:', roundToolCalls.map(tc => tc.function.name))
          const toolResults = await executeToolCalls(roundToolCalls, toolRegistry)

          // 发送工具调用结果事件并收集持久化数据
          for (const result of toolResults) {
            const resultData = sendToolResultEvent(controller, encoder, result, sessionId)
            allToolResultsData.push(resultData)
          }

          // 构建下一轮请求的消息
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
            messages: currentMessages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
            enableThinking,
            thinkingBudget,
            tools: toolRegistry.getToolDefinitions(),
          })

          currentReader = nextReader
        }

        // 把图片生成结果插入到 answerContent 中，确保刷新后能显示
        let contentWithImages = finalAnswerContent
        for (const resultData of allToolResultsData) {
          if (resultData.name === 'generate_image' && resultData.result?.imageUrl) {
            // 从 tool call 参数中获取 prompt
            const toolCall = allToolCalls.find(tc => tc.id === resultData.toolCallId)
            let prompt = '生成的图片'
            if (toolCall) {
              try {
                const args = JSON.parse(toolCall.function.arguments)
                prompt = args.prompt || prompt
              } catch {
                // 忽略解析错误
              }
            }
            const imageData = JSON.stringify({
              url: resultData.result.imageUrl,
              alt: prompt,
              width: resultData.result.width || 512,
              height: resultData.result.height || 512,
            })
            contentWithImages += `\n\`\`\`image\n${imageData}\n\`\`\`\n`
          }
        }

        // 保存最终内容
        await saveMessageContent(messageId, conversationId, userId, {
          thinkingContent,
          answerContent: contentWithImages,
          toolCallsData: allToolCalls.length > 0 ? allToolCalls : null,
          toolResultsData: allToolResultsData.length > 0 ? allToolResultsData : undefined,
        })

        // 发送完成信号
        sendEvent(controller, encoder, { type: 'complete', sessionId })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

      } catch (error) {
        console.error('[StreamHandler] Error in tool stream:', error)
        controller.error(error)
      }
    },
  })
}

/**
 * 处理单轮 AI 响应，返回 thinking、answer 和 tool_calls
 */
async function processAIResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  sessionId: string
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
          sendEvent(controller, encoder, {
            type: 'thinking',
            content: delta.reasoning_content,
            sessionId,
          })
        }

        if (delta?.content) {
          answerContent += delta.content
          sendEvent(controller, encoder, {
            type: 'answer',
            content: delta.content,
            sessionId,
          })
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
                  (toolCallsChunks[idx].function!.arguments || '') + tc.function.arguments
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
    .filter(tc => tc.id && tc.function?.name)
    .map(tc => ({
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
 * 发送工具调用开始事件
 */
function sendToolCallEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  tc: ToolCall,
  sessionId: string
): void {
  const toolName = tc.function.name
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(tc.function.arguments)
  } catch {
    // ignore
  }

  if (toolName === 'web_search') {
    sendEvent(controller, encoder, {
      type: 'tool_call',
      toolCallId: tc.id,
      name: 'web_search',
      query: args.query as string,
      sessionId,
    })
  } else if (toolName === 'generate_image') {
    sendEvent(controller, encoder, {
      type: 'tool_call',
      toolCallId: tc.id,
      name: 'generate_image',
      prompt: args.prompt as string,
      sessionId,
    })
  } else {
    sendEvent(controller, encoder, {
      type: 'tool_call',
      toolCallId: tc.id,
      name: toolName,
      sessionId,
    })
  }
}

/**
 * 搜索来源类型
 */
interface SearchSource {
  title: string
  url: string
  snippet?: string
}

/**
 * 发送工具调用结果事件并返回持久化数据
 */
function sendToolResultEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  result: { toolCallId: string; name: string; success: boolean; content: string },
  sessionId: string
): { toolCallId: string; name: string; result: { success: boolean; imageUrl?: string; prompt?: string; resultCount?: number; sources?: SearchSource[] } } {
  if (result.name === 'web_search') {
    // 解析搜索结果 JSON
    let resultCount = 0
    let sources: SearchSource[] = []
    try {
      const parsed = JSON.parse(result.content)
      resultCount = parsed.resultCount || 0
      sources = parsed.sources || []
    } catch {
      // 旧格式，fallback
      resultCount = result.success ? 1 : 0
    }
    
    sendEvent(controller, encoder, {
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: 'web_search',
      resultCount,
      sources,
      success: result.success,
      sessionId,
    })
    return {
      toolCallId: result.toolCallId,
      name: 'web_search',
      result: { success: result.success, resultCount, sources },
    }
  } else if (result.name === 'generate_image') {
    let imageUrl: string | undefined
    let width: number | undefined
    let height: number | undefined
    if (result.success) {
      try {
        const parsed = JSON.parse(result.content)
        imageUrl = parsed.url
        width = parsed.width
        height = parsed.height
      } catch {
        // 忽略解析错误
      }
    }
    sendEvent(controller, encoder, {
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: 'generate_image',
      success: result.success,
      imageUrl,
      width,
      height,
      sessionId,
    })
    return {
      toolCallId: result.toolCallId,
      name: 'generate_image',
      result: { success: result.success, imageUrl, width, height },
    }
  } else {
    sendEvent(controller, encoder, {
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: result.name,
      success: result.success,
      sessionId,
    })
    return {
      toolCallId: result.toolCallId,
      name: result.name,
      result: { success: result.success },
    }
  }
}
