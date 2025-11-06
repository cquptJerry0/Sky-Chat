/**
 * User Repository
 * 
 * 用户数据访问层
 */

import { prisma } from '@/server/db/client'

export const UserRepository = {
  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    })
  },

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        apiKey: true,
        createdAt: true,
      },
    })
  },

  /**
   * 创建用户
   */
  async create(data: { username: string; password: string }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    })
  },
}

