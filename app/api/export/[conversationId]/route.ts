/**
 * 导出单个会话 API
 * GET /api/export/[conversationId]?format=markdown&includeThinking=true&includeMetadata=false
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { MarkdownExporter } from '@/server/services/export/markdown-exporter'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { conversationId } = await params
    const { searchParams } = new URL(req.url)

    // 解析查询参数
    const format = searchParams.get('format') || 'markdown'
    const includeThinking = searchParams.get('includeThinking') === 'true'
    const includeMetadata = searchParams.get('includeMetadata') === 'true'

    // 目前只支持 Markdown 格式
    if (format !== 'markdown') {
      return NextResponse.json(
        { error: 'Only markdown format is supported currently' },
        { status: 400 }
      )
    }

    // 导出为 Markdown
    const exporter = new MarkdownExporter()
    const markdown = await exporter.exportConversation(
      conversationId,
      userId,
      { includeThinking, includeMetadata }
    )

    // 返回文件下载
    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="conversation-${conversationId}.md"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)

    if (error instanceof Error && error.message === 'Conversation not found') {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

