/**
 * 批量导出会话 API
 * POST /api/conversations/batch-export
 * 
 * 请求体：
 * - conversationIds: string[] - 要导出的会话ID列表（可选，不提供则导出全部）
 * - format: 导出格式
 * - includeThinking: 是否包含思考过程
 * - includeMetadata: 是否包含元数据
 * - dateRange: 日期范围筛选
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { exportService, type ExportOptions } from '@/server/services/export.service'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    
    const {
      conversationIds,
      format = 'json',
      includeThinking = false,
      includeMetadata = true,
      dateRange
    } = body
    
    const options: ExportOptions = {
      format: format as ExportOptions['format'],
      includeThinking,
      includeMetadata,
      dateRange: dateRange ? {
        start: dateRange.start ? new Date(dateRange.start) : undefined,
        end: dateRange.end ? new Date(dateRange.end) : undefined
      } : undefined
    }
    
    // 验证格式
    const validFormats = ['markdown', 'json', 'txt', 'html', 'pdf']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: ' + validFormats.join(', ') },
        { status: 400 }
      )
    }
    
    // 根据是否提供ID列表决定导出方式
    let result
    if (conversationIds && Array.isArray(conversationIds) && conversationIds.length > 0) {
      // 批量导出指定会话
      result = await exportService.exportBatch(conversationIds, userId, options)
    } else {
      // 导出所有会话
      result = await exportService.exportAll(userId, options)
    }
    
    // 返回文件下载响应
    return new NextResponse(result.content, {
      headers: {
        'Content-Type': `${result.mimeType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Batch export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
