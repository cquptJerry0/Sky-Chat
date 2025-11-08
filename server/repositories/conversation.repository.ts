/**
 * Conversation Repository
 * 
 * 会话数据访问层
 */

import { prisma } from '@/server/db/client'

export const ConversationRepository = {
  /**
   * 获取用户所有会话（按更新时间倒序）
   */
  async findByUserId(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    })
  },

  /**
   * 创建新会话
   */
  async create(userId: string, title = '新对话') {
    return prisma.conversation.create({
      data: { userId, title },
    })
  },

  /**
   * 获取单个会话（含权限检查）
   */
  async findById(id: string, userId: string) {
    return prisma.conversation.findFirst({
      where: { id, userId },
    })
  },

  /**
   * 更新会话标题
   */
  async updateTitle(id: string, userId: string, title: string) {
    const result = await prisma.conversation.updateMany({
      where: { id, userId },
      data: { title, updatedAt: new Date() },
    })
    return result.count > 0
  },

  /**
   * 更新会话的 updatedAt 时间戳（带权限检查）
   */
  async touch(id: string, userId?: string) {
    if (userId) {
      // 带权限检查的更新
      await prisma.conversation.updateMany({
        where: { id, userId },
        data: { updatedAt: new Date() },
      })
    } else {
      // 无权限检查（向后兼容）
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      })
    }
  },

  /**
   * 删除会话
   */
  async delete(id: string, userId: string) {
    const result = await prisma.conversation.deleteMany({
      where: { id, userId },
    })
    return result.count > 0
  },
}

