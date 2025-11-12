import { AuditLogRepository, type AuditAction } from '@/server/repositories/audit-log.repository'
import type { Prisma } from '@prisma/client'

interface AuditParams {
  userId: string
  action: AuditAction
  resourceId?: string
  metadata?: Prisma.InputJsonValue
  request?: Request
}

export async function audit(params: AuditParams) {
  const { userId, action, resourceId, metadata, request } = params

  let ipAddress: string | undefined
  let userAgent: string | undefined

  if (request) {
    ipAddress = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                undefined
    userAgent = request.headers.get('user-agent') || undefined
  }

  await AuditLogRepository.create({
    userId,
    action,
    resourceId,
    metadata,
    ipAddress,
    userAgent,
  })
}

export function createAuditMiddleware(action: AuditAction) {
  return async (userId: string, resourceId?: string, request?: Request) => {
    await audit({
      userId,
      action,
      resourceId,
      request,
    })
  }
}

