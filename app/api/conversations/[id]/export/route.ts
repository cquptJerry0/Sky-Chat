/**
 * 会话导出 API
 * GET /api/conversations/[id]/export - 导出单个会话
 * 
 * 支持的格式：
 * - markdown (.md)
 * - json (.json)
 * - txt (.txt)
 * - html (.html)
 * - pdf (返回HTML，前端转换)
 * 
 * 查询参数：
 * - format: 导出格式
 * - includeThinking: 是否包含思考过程
 * - includeMetadata: 是否包含元数据
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { exportService, type ExportOptions } from '@/server/services/export.service'

/**
 * 导出单个会话
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params
    const { searchParams } = new URL(req.url)
    
    // 解析查询参数
    const format = searchParams.get('format') as ExportOptions['format'] || 'markdown'
    const includeThinking = searchParams.get('includeThinking') === 'true'
    const includeMetadata = searchParams.get('includeMetadata') === 'true'
    
    // 日期范围（可选）
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const options: ExportOptions = {
      format,
      includeThinking,
      includeMetadata,
      dateRange: (startDate || endDate) ? {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
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

    // 使用导出服务
    const result = await exportService.exportConversation(id, userId, options)

    // 返回文件下载响应
    return new NextResponse(result.content, {
      headers: {
        'Content-Type': `${result.mimeType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Export conversation error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

