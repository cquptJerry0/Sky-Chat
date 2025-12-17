/**
 * SSE 流处理器
 * 
 * 处理 AI API 返回的流式响应，转发给客户端
 */

import { MessageRepository } from '@/server/repositories/message.repository'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { parseSSELine, splitSSEBuffer } from '@/lib/utils/sse'
import { generateImage } from '@/server/services/image/siliconflow'
import { downloadAndSave } from '@/server/services/image/storage'

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
            // 先保存原始内容
            await saveMessageContent(messageId, conversationId, userId, {
              thinkingContent,
              answerContent,
              toolCallsData,
            })

            // 发送完成信号（不等待图片生成）
            sendEvent(controller, encoder, { type: 'complete', sessionId })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            
            // 后台异步处理图片生成（不阻塞响应）
            processImageBlocks(answerContent).then(async (processedContent) => {
              if (processedContent !== answerContent) {
                await MessageRepository.update(messageId, { content: processedContent })
              }
            }).catch((err: Error) => {
              console.error('[StreamHandler] Async image processing failed:', err)
            })
            
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
 * 处理 content 中的 image 生成块
 * 检测 ```image 块，如果有 generate: true，调用生图 API 并替换为实际 URL
 */
async function processImageBlocks(content: string): Promise<string> {
  // 匹配 ```image ... ``` 块
  const imageBlockRegex = /```image\n([\s\S]*?)```/g
  let result = content
  let match

  while ((match = imageBlockRegex.exec(content)) !== null) {
    const blockContent = match[1].trim()
    
    try {
      const data = JSON.parse(blockContent)
      
      // 只处理 generate: true 的块
      if (data.generate && data.prompt) {
        console.log('[StreamHandler] Generating image for prompt:', data.prompt)
        
        // 调用生图 API
        const genResult = await generateImage({
          prompt: data.prompt,
          negative_prompt: data.negative_prompt,
          model: data.model,
          image_size: data.image_size,
        })
        
        // 下载并保存图片
        const stored = await downloadAndSave(genResult.url)
        
        // 构建新的 image 块（只有 url 和 alt）
        const newData = {
          url: stored.localUrl,
          alt: data.alt || data.prompt,
        }
        
        const newBlock = '```image\n' + JSON.stringify(newData) + '\n```'
        result = result.replace(match[0], newBlock)
        
        console.log('[StreamHandler] Image generated:', stored.localUrl)
      }
    } catch (error) {
      console.error('[StreamHandler] Failed to process image block:', error)
      // 保留原始块，不做替换
    }
  }
  
  return result
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
    // 处理 image 生成块
    const processedContent = await processImageBlocks(content.answerContent)
    
    await MessageRepository.update(messageId, {
      content: processedContent,
      thinking: content.thinkingContent || undefined,
      toolCalls: content.toolCallsData || undefined,
    })

    await ConversationRepository.touch(conversationId, userId)
  } catch (error) {
    console.error('[StreamHandler] Failed to save message:', error)
  }
}


import { createChatCompletion } from '@/server/services/ai/siliconflow'
import { toolRegistry, type ToolCall } from '@/server/services/tools'
import { executeToolCalls, formatToolMessages, extractSearchQuery } from '@/server/services/tools/handler'

export interface StreamContextWithTools extends StreamContext {
  apiKey: string
  model: string
  contextMessages: Array<{ role: string; content: string }>
  enableThinking: boolean
  thinkingBudget: number
}

/**
 * 创建支持工具调用的 SSE 流响应
 */
export function createSSEStreamWithTools(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: StreamContextWithTools
): ReadableStream {
  const { messageId, conversationId, userId, sessionId, apiKey, model, contextMessages, enableThinking, thinkingBudget } = context
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = ''
        let thinkingContent = ''
        let answerContent = ''
        const toolCallsChunks: Array<{ index: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }> = []

        // 第一阶段：收集第一次 AI 响应
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

              // 收集 tool_calls 片段（流式返回时是分片的）
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

        // 检查是否有工具调用
        const hasToolCalls = toolCallsChunks.length > 0 && toolCallsChunks.some(tc => tc.id && tc.function?.name)

        if (hasToolCalls) {
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

          // 发送工具调用开始事件
          const searchQuery = extractSearchQuery(toolCalls)
          sendEvent(controller, encoder, {
            type: 'tool_call',
            name: 'web_search',
            query: searchQuery,
            sessionId,
          })

          // 执行工具调用
          console.log('[StreamHandler] Executing tool calls:', toolCalls.map(tc => tc.function.name))
          const toolResults = await executeToolCalls(toolCalls, toolRegistry)

          // 发送工具调用结果事件
          const resultCount = toolResults.filter(r => r.success).length
          sendEvent(controller, encoder, {
            type: 'tool_result',
            name: 'web_search',
            resultCount,
            success: resultCount > 0,
            sessionId,
          })

          // 构建第二次请求的消息
          const toolMessages = formatToolMessages(toolResults)
          const secondMessages = [
            ...contextMessages,
            {
              role: 'assistant',
              content: answerContent || null,
              tool_calls: toolCalls,
            },
            ...toolMessages,
          ]

          // 发起第二次 AI 请求
          const { reader: secondReader } = await createChatCompletion(apiKey, {
            model,
            messages: secondMessages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
            enableThinking,
            thinkingBudget,
          })

          // 流式返回第二次响应
          let secondBuffer = ''
          let secondAnswerContent = ''

          while (true) {
            const { done, value } = await secondReader.read()
            
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            secondBuffer += chunk

            const { lines, remaining } = splitSSEBuffer(secondBuffer)
            secondBuffer = remaining

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
                  secondAnswerContent += delta.content
                  sendEvent(controller, encoder, {
                    type: 'answer',
                    content: delta.content,
                    sessionId,
                  })
                }
              } catch {
                // 忽略解析错误
              }
            }
          }

          // 保存最终内容（第二次响应的内容）
          await saveMessageContent(messageId, conversationId, userId, {
            thinkingContent,
            answerContent: secondAnswerContent,
            toolCallsData: toolCalls,
          })
        } else {
          // 没有工具调用，直接保存第一次响应
          await saveMessageContent(messageId, conversationId, userId, {
            thinkingContent,
            answerContent,
            toolCallsData: null,
          })
        }

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
