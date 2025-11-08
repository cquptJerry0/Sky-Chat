/**
 * Message Repository
 * 
 * 消息数据访问层
 */

import { prisma } from '@/server/db/client'
import type { Prisma } from '@prisma/client'

export const MessageRepository = {
  /**
   * 根据ID获取单个消息
   */
  async findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
    })
  },

  /**
   * 获取会话所有消息
   */
  async findByConversationId(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })
  },

  /**
   * 创建消息
   */
  async create(data: {
    id?: string
    conversationId: string
    role: string
    content: string
    thinking?: string
    toolCalls?: Prisma.InputJsonValue
  }) {
    return prisma.message.create({
      data,
    })
  },

  /**
   * 更新消息
   */
  async update(
    id: string,
    data: {
      content?: string
      thinking?: string
      toolCalls?: Prisma.InputJsonValue
    }
  ) {
    return prisma.message.update({
      where: { id },
      data,
    })
  },

  /**
   * 批量创建消息
   */
  async createMany(
    messages: Array<{
      conversationId: string
      role: string
      content: string
      thinking?: string
      toolCalls?: Prisma.InputJsonValue
    }>
  ) {
    return prisma.message.createMany({
      data: messages,
    })
  },

  /**
   * 删除会话的所有消息
   */
  async deleteByConversationId(conversationId: string) {
    return prisma.message.deleteMany({
      where: { conversationId },
    })
  },
}

