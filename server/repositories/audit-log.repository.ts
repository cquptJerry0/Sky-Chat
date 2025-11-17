import { prisma } from '@/server/db/client'
import type { Prisma } from '@prisma/client'

export type AuditAction =
  | 'conversation.view'
  | 'conversation.create'
  | 'conversation.update'
  | 'conversation.delete'
  | 'message.view'
  | 'message.create'
  | 'message.delete'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.link_account'

interface CreateAuditLogParams {
  userId: string
  action: AuditAction
  resourceId?: string
  metadata?: Prisma.InputJsonValue
  ipAddress?: string
  userAgent?: string
}

export const AuditLogRepository = {
  async create(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: params,
      })
    } catch (error) {
      console.error('[AuditLog] Failed to create log:', error)
      return null
    }
  },

  async findByUserId(userId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  async findByAction(action: AuditAction, limit = 100) {
    return prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },

  async findByResourceId(resourceId: string) {
    return prisma.auditLog.findMany({
      where: { resourceId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async findSuspiciousActivity(userId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
    })

    const suspiciousPatterns: Array<{
      type: string
      count: number
      message: string
    }> = []

    const viewActions = recentLogs.filter((log: { action: string }) => log.action === 'conversation.view')
    if (viewActions.length > 50) {
      suspiciousPatterns.push({
        type: 'excessive_views',
        count: viewActions.length,
        message: 'Excessive conversation views in the last hour',
      })
    }

    const deleteActions = recentLogs.filter((log: { action: string }) => log.action === 'conversation.delete')
    if (deleteActions.length > 10) {
      suspiciousPatterns.push({
        type: 'excessive_deletes',
        count: deleteActions.length,
        message: 'Excessive conversation deletions in the last hour',
      })
    }

    return suspiciousPatterns
  },

  async deleteOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return result.count
  },
}

