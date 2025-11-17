import { getModelById } from '@/features/chat/constants/models'
import { getCurrentUserId } from '@/server/auth/utils'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { MessageRepository } from '@/server/repositories/message.repository'
import { UserRepository } from '@/server/repositories/user.repository'
import { streamManager } from '@/server/services/stream-manager'
import { prisma } from '@/server/db/client'

export async function POST(req: Request) {
  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await UserRepository.findById(userId)
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // 使用用户的 API Key,如果没有则使用系统默认的
  const apiKey = user.apiKey || process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return Response.json(
      { error: 'API Key not configured. Please set your SiliconFlow API Key in your profile or contact administrator.' },
      { status: 400 }
    )
  }

  const {
    content,
    conversationId,
    model = 'Qwen/Qwen2.5-7B-Instruct',
    enableThinking = false,
    thinkingBudget = 4096,
    tools,
    userMessageId,  // 前端传来的 user 消息 ID（如果为 undefined，说明是重试）
    aiMessageId,    // 前端传来的 AI 消息 ID
    attachments,    // 文件附件列表
  } = await req.json()

  if (!content?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  const modelInfo = getModelById(model)

  try {
    let conversation
    if (conversationId) {
      conversation = await ConversationRepository.findById(conversationId, userId)
      if (!conversation) {
        return Response.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    } else {
      conversation = await ConversationRepository.create(userId)
    }

    // 使用前端传来的 AI 消息 ID，如果没有则生成
    const messageId = aiMessageId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // 创建时间戳，确保 assistant 消息在 user 消息之后
    const now = new Date()
    const userMessageTime = now
    const assistantMessageTime = new Date(now.getTime() + 1) // 加 1 毫秒

    // 统一的消息创建逻辑：根据 userMessageId 是否存在决定是否创建 user 消息
    if (userMessageId) {
      // 需要创建 user 消息（正常发送、编辑重发）
      await prisma.$transaction([
        prisma.message.create({
          data: {
            id: userMessageId,
            conversationId: conversation.id,
            role: 'user',
            content,
            attachments: attachments || undefined, // 存储文件附件
            createdAt: userMessageTime,
          },
        }),
        prisma.message.create({
          data: {
            id: messageId,
            conversationId: conversation.id,
            role: 'assistant',
            content: '',
            createdAt: assistantMessageTime,
          },
        }),
      ])
    } else {
      // 不需要创建 user 消息（重试）
      await prisma.message.create({
        data: {
          id: messageId,
          conversationId: conversation.id,
          role: 'assistant',
          content: '',
          createdAt: assistantMessageTime,
        },
      })
    }
    
    // 自动生成会话标题（如果是第一条消息且标题为"新对话"）
    const messageCount = await prisma.message.count({
      where: { conversationId: conversation.id }
    })
    
    let updatedTitle = conversation.title
    if (messageCount === 2 && conversation.title === '新对话') {
      // 根据第一条消息内容生成标题（最多20个字符）
      updatedTitle = content.trim().substring(0, 20) + (content.length > 20 ? '...' : '')
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: updatedTitle }
      })
    }

    // 获取历史消息（用于上下文）
    const historyMessages = await MessageRepository.findByConversationId(conversation.id)

    // 构建当前用户消息内容（包含文件内容）
    let currentUserMessage = content
    if (attachments && attachments.length > 0) {
      // 将文件内容添加到消息中
      const fileContents = attachments.map((file: { name: string; content: string }) => {
        return `\n\n---\n**附件: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``
      }).join('\n')

      currentUserMessage = content + fileContents
    }

    // 构建消息上下文（系统消息 + 历史消息 + 当前消息）
    const contextMessages = [
      {
        role: 'system',
        content: 'You are a helpful assistant. 你是一个友好的 AI 助手。',
      },
      // 历史消息
      ...historyMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      // 当前用户消息（包含文件内容）
      {
        role: 'user',
        content: currentUserMessage,
      },
    ]
    
    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model,
      messages: contextMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
    }

    // Reasoning 模型：只用 thinking_budget
    if (modelInfo?.isReasoningModel) {
      requestBody.thinking_budget = thinkingBudget
    }
    // 普通模型支持思考开关：用 enable_thinking + thinking_budget
    else if (enableThinking && modelInfo?.supportsThinkingToggle) {
      requestBody.enable_thinking = true
      requestBody.thinking_budget = thinkingBudget
    }

    // 如果提供了 tools，添加到请求中
    if (tools && Array.isArray(tools) && tools.length > 0) {
      requestBody.tools = tools
    }

    const siliconResponse = await fetch(
      'https://api.siliconflow.cn/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!siliconResponse.ok) {
      const errorText = await siliconResponse.text()
      throw new Error(
        `SiliconFlow API error: ${siliconResponse.status} - ${errorText}`
      )
    }

    const reader = siliconResponse.body?.getReader()
    if (!reader) {
      throw new Error('No stream available')
    }

    const sessionId = Date.now().toString()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    // 创建StreamManager任务
    streamManager.createTask(messageId, userId, conversation.id)
    
    // 前端是否已断开
    let frontendDisconnected = false
    
    // 超时定时器 - 30秒无数据则清理
    let lastDataTime = Date.now()
    const timeoutDuration = 30000 // 30秒
    const timeoutInterval = setInterval(() => {
      if (Date.now() - lastDataTime > timeoutDuration) {
        clearInterval(timeoutInterval)
        reader.cancel().catch(() => {})
        streamManager.errorTask(messageId)
      }
    }, 5000) // 每5秒检查一次

    // 实时转发流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = ''
          let thinkingContent = ''
          let answerContent = ''
          let toolCallsData = null

          while (true) {
            lastDataTime = Date.now() // 更新最后数据时间
            const { done, value } = await reader.read()
            if (done) {
              // 清理超时定时器
              clearInterval(timeoutInterval)
              
              // 更新fullContent到StreamManager
              streamManager.updateFullContent(messageId, thinkingContent, answerContent)
              streamManager.completeTask(messageId)
              
              // 更新数据库中的消息（而非创建新消息）
              try {
                await MessageRepository.update(messageId, {
                  content: answerContent,
                  thinking: thinkingContent || undefined,
                  toolCalls: toolCallsData || undefined,
                })
                
                await ConversationRepository.touch(conversation.id, userId)
              } catch (error) {
                console.error('[Chat API] Failed to update message on completion:', error)
                // 不抛出错误，因为流已经发送给前端
              }

              // 如果前端还在连接，发送完成信号
              if (!frontendDisconnected) {
                const completeData = JSON.stringify({
                  type: 'complete',
                  sessionId,
                })
                controller.enqueue(encoder.encode(`data: ${completeData}\n\n`))
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
              }
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // 按行分割，但保留最后一行（可能不完整）
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta

                  // 处理 reasoning_content (thinking)
                  if (delta?.reasoning_content) {
                    thinkingContent += delta.reasoning_content
                    
                    // 更新fullContent到StreamManager
                    streamManager.updateFullContent(messageId, thinkingContent, answerContent)

                    // 只有前端还在连接时才发送
                    if (!frontendDisconnected) {
                      const thinkingData = JSON.stringify({
                        type: 'thinking',
                        content: delta.reasoning_content,
                        sessionId,
                      })
                      controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`))
                    }
                  }

                  // 处理 content (answer)
                  if (delta?.content) {
                    answerContent += delta.content
                    
                    // 更新fullContent到StreamManager
                    streamManager.updateFullContent(messageId, thinkingContent, answerContent)

                    // 只有前端还在连接时才发送
                    if (!frontendDisconnected) {
                      const answerData = JSON.stringify({
                        type: 'answer',
                        content: delta.content,
                        sessionId,
                      })
                      controller.enqueue(encoder.encode(`data: ${answerData}\n\n`))
                    }
                  }

                  // 处理 tool_calls
                  if (delta?.tool_calls) {
                    toolCallsData = delta.tool_calls
                    if (!frontendDisconnected) {
                      const toolData = JSON.stringify({
                        type: 'tool_calls',
                        tool_calls: delta.tool_calls,
                        sessionId,
                      })
                      controller.enqueue(encoder.encode(`data: ${toolData}\n\n`))
                    }
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          clearInterval(timeoutInterval)
          streamManager.errorTask(messageId)
          if (!frontendDisconnected) {
            controller.error(error)
          }
        }
      },
      cancel() {
        // 清理超时定时器
        clearInterval(timeoutInterval)

        // 前端断开连接，继续收集后端内容
        frontendDisconnected = true

        // 立即保存当前进度到数据库（防止服务器重启丢失）
        const task = streamManager.getTask(messageId)
        if (task && (task.fullContent || task.fullThinking)) {
          MessageRepository.update(messageId, {
            content: task.fullContent,
            thinking: task.fullThinking || undefined,
          }).catch((error) => {
            console.error('[Chat API] Failed to save progress on disconnect:', error)
          })
        }
        // 不要取消硅基流动的reader，让它继续收集
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-ID': sessionId,
        'X-Conversation-ID': conversation.id,
        'X-Conversation-Title': encodeURIComponent(updatedTitle),
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat API error:', errorMessage)
    return Response.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
