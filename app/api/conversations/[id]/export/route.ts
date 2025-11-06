/**
 * 会话导出 API
 * GET /api/conversations/[id]/export?format=markdown - 导出会话为 Markdown
 * GET /api/conversations/[id]/export?format=json - 导出会话为 JSON
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'
import { prisma } from '@/server/db/client'

/**
 * 将会话转换为 Markdown 格式
 */
function toMarkdown(conversation: any): string {
  let markdown = `# ${conversation.title}\n\n`
  markdown += `创建时间: ${new Date(conversation.createdAt).toLocaleString('zh-CN')}\n\n`
  markdown += `---\n\n`

  for (const message of conversation.messages) {
    const role = message.role === 'user' ? '👤 用户' : '🤖 助手'
    markdown += `## ${role}\n\n`

    if (message.thinking) {
      markdown += `**思考过程：**\n\n${message.thinking}\n\n`
      markdown += `**回答：**\n\n`
    }

    markdown += `${message.content}\n\n`
    markdown += `---\n\n`
  }

  markdown += `\n_导出时间: ${new Date().toLocaleString('zh-CN')}_\n`
  return markdown
}

/**
 * 导出会话
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'markdown'

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (format === 'markdown') {
      const markdown = toMarkdown(conversation)
      const filename = `${conversation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.md`

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
    } else if (format === 'json') {
      const filename = `${conversation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.json`

      return new NextResponse(JSON.stringify(conversation, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Export conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

