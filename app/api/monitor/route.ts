/**
 * 监控事件上报 API
 *
 * 接收前端 SDK 上报的埋点事件，存储到数据库
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'

/** 事件结构 */
interface MonitorEventPayload {
  id: string
  type: string
  timestamp: number
  data: Record<string, unknown>
  context: {
    appId?: string
    sessionId?: string
    traceId?: string
    [key: string]: unknown
  }
}

/**
 * 验证事件结构
 */
function validateEvent(event: unknown): event is MonitorEventPayload {
  if (!event || typeof event !== 'object') return false
  const e = event as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.type === 'string' &&
    typeof e.timestamp === 'number' &&
    typeof e.data === 'object' &&
    typeof e.context === 'object'
  )
}

/**
 * POST /api/monitor
 * 接收单个事件或事件数组
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 支持单个事件或数组
    const events: unknown[] = Array.isArray(body) ? body : [body]

    if (events.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有事件数据' },
        { status: 400 }
      )
    }

    // 验证所有事件
    const validEvents: MonitorEventPayload[] = []
    for (const event of events) {
      if (!validateEvent(event)) {
        return NextResponse.json(
          { success: false, error: '事件格式无效' },
          { status: 400 }
        )
      }
      validEvents.push(event)
    }

    // 批量写入数据库
    await prisma.monitorEvent.createMany({
      data: validEvents.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: new Date(e.timestamp),
        data: e.data as object,
        context: e.context as object,
      })),
      skipDuplicates: true, // 跳过重复 ID
    })

    return NextResponse.json({ success: true, count: validEvents.length })
  } catch (error) {
    console.error('[Monitor API] 写入失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
