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
   * 获取会话所有消息（支持限制数量）
   * 返回正序数组（从旧到新）
   */
  async findByConversationId(conversationId: string, limit?: number) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },  // 先倒序查询最新N条
      take: limit,
    })
    
    // 返回正序（旧 → 新）
    return messages.reverse()
  },

  /**
   * 分页获取消息（游标分页）
   */
  async findPaginated(
    conversationId: string,
    options: {
      cursor: string
      direction: 'before' | 'after'
      limit: number
    }
  ) {
    const { cursor, direction, limit } = options

    // 先找到游标消息
    const cursorMessage = await prisma.message.findUnique({
      where: { id: cursor },
    })

    if (!cursorMessage) {
      return []
    }

    // 根据方向查询
    if (direction === 'before') {
      // 查询更早的消息
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          createdAt: { lt: cursorMessage.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return messages.reverse() // 返回时按时间正序
    } else {
      // 查询更新的消息
      return prisma.message.findMany({
        where: {
          conversationId,
          createdAt: { gt: cursorMessage.createdAt },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      })
    }
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

