/**
 * Chat Service - 聊天核心业务逻辑
 * 
 * 负责：
 * - 会话管理
 * - 消息创建
 * - 调用 AI API
 * - 返回流式响应
 */

import { prisma } from '@/server/db/client'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { MessageRepository } from '@/server/repositories/message.repository'
import { createChatCompletion } from '@/server/services/ai/siliconflow'
import { buildContextMessages, appendAttachments } from './prompt.builder'
import { createSSEStream } from './stream.handler'

export interface ChatRequest {
  content: string
  conversationId?: string
  model?: string
  enableThinking?: boolean
  thinkingBudget?: number
  tools?: unknown[]
  userMessageId?: string
  aiMessageId?: string
  attachments?: Array<{ name: string; content: string; type: string; size: number }>
}

export interface ChatResponse {
  stream: ReadableStream
  sessionId: string
  conversationId: string
  conversationTitle: string
}

/**
 * 处理聊天请求
 */
export async function handleChatRequest(
  userId: string,
  apiKey: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const {
    content,
    conversationId,
    model = 'Qwen/Qwen2.5-7B-Instruct',
    enableThinking = false,
    thinkingBudget = 4096,
    tools,
    userMessageId,
    aiMessageId,
    attachments,
  } = request

  // 1. 获取或创建会话
  const conversation = await getOrCreateConversation(conversationId, userId)

  // 2. 创建消息记录
  const messageId = aiMessageId || generateMessageId()
  await createMessages(conversation.id, content, userMessageId, messageId, attachments)

  // 3. 更新会话标题（如果是第一条消息）
  const updatedTitle = await updateConversationTitle(conversation, content)

  // 4. 获取历史消息并构建上下文
  const historyMessages = await MessageRepository.findByConversationId(conversation.id)
  const currentUserMessage = appendAttachments(content, attachments)
  const contextMessages = buildContextMessages(historyMessages, currentUserMessage)

  // 5. 调用 AI API
  const { reader } = await createChatCompletion(apiKey, {
    model,
    messages: contextMessages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    enableThinking,
    thinkingBudget,
    tools,
  })

  // 6. 创建 SSE 流
  const sessionId = Date.now().toString()
  const stream = createSSEStream(reader, {
    messageId,
    conversationId: conversation.id,
    userId,
    sessionId,
  })

  return {
    stream,
    sessionId,
    conversationId: conversation.id,
    conversationTitle: updatedTitle,
  }
}

/**
 * 获取或创建会话
 */
async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string
) {
  if (conversationId) {
    const conversation = await ConversationRepository.findById(conversationId, userId)
    if (!conversation) {
      throw new NotFoundError('Conversation not found')
    }
    return conversation
  }
  return ConversationRepository.create(userId)
}

/**
 * 创建消息记录
 */
async function createMessages(
  conversationId: string,
  content: string,
  userMessageId: string | undefined,
  aiMessageId: string,
  attachments?: Array<{ name: string; content: string; type: string; size: number }>
): Promise<void> {
  const now = new Date()
  const userMessageTime = now
  const assistantMessageTime = new Date(now.getTime() + 1)

  if (userMessageId) {
    // 需要创建 user 消息（正常发送、编辑重发）
    await prisma.$transaction([
      prisma.message.create({
        data: {
          id: userMessageId,
          conversationId,
          role: 'user',
          content,
          attachments: attachments || undefined,
          createdAt: userMessageTime,
        },
      }),
      prisma.message.create({
        data: {
          id: aiMessageId,
          conversationId,
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
        id: aiMessageId,
        conversationId,
        role: 'assistant',
        content: '',
        createdAt: assistantMessageTime,
      },
    })
  }
}

/**
 * 更新会话标题
 */
async function updateConversationTitle(
  conversation: { id: string; title: string },
  content: string
): Promise<string> {
  const messageCount = await prisma.message.count({
    where: { conversationId: conversation.id },
  })

  if (messageCount === 2 && conversation.title === '新对话') {
    const newTitle = content.trim().substring(0, 20) + (content.length > 20 ? '...' : '')
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: newTitle },
    })
    return newTitle
  }

  return conversation.title
}

/**
 * 生成消息 ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 自定义错误类
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
