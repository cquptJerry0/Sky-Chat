/**
 * Markdown 导出服务（后端）
 * 
 * 从数据库读取会话和消息，生成 Markdown 格式文件
 */

import { MessageRepository } from '@/server/repositories/message.repository'
import { ConversationRepository } from '@/server/repositories/conversation.repository'

export interface MarkdownExportOptions {
  includeThinking?: boolean
  includeMetadata?: boolean
}

export class MarkdownExporter {
  /**
   * 导出单个会话为 Markdown
   */
  async exportConversation(
    conversationId: string,
    userId: string,
    options: MarkdownExportOptions = {}
  ): Promise<string> {
    const { includeThinking = false, includeMetadata = false } = options

    // 获取会话信息
    const conversation = await ConversationRepository.findById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // 获取所有消息
    const messages = await MessageRepository.findByConversationId(conversationId)

    // 生成 Markdown 内容
    let content = `# ${conversation.title}\n\n`

    // 添加元数据
    if (includeMetadata) {
      content += `**Created:** ${conversation.createdAt.toISOString()}\n`
      content += `**Updated:** ${conversation.updatedAt.toISOString()}\n`
      content += `**Messages:** ${messages.length}\n\n`
      content += '---\n\n'
    }

    // 添加消息
    messages.forEach((msg, index) => {
      if (index > 0) {
        content += '\n---\n\n'
      }

      // 角色标签
      const roleLabel = msg.role === 'user' ? '**User**' : '**Assistant**'
      content += `${roleLabel}\n\n`

      // Thinking 内容（如果有）
      if (includeThinking && msg.thinking) {
        content += '<details>\n'
        content += '<summary>💭 Thinking Process</summary>\n\n'
        content += msg.thinking
        content += '\n\n</details>\n\n'
      }

      // 消息内容
      content += msg.content + '\n'
    })

    // 添加导出时间戳
    content += `\n---\n\n*Exported: ${new Date().toISOString()}*\n`

    return content
  }

  /**
   * 批量导出多个会话
   */
  async exportBatch(
    conversationIds: string[],
    userId: string,
    options: MarkdownExportOptions = {}
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()

    for (const id of conversationIds) {
      try {
        const markdown = await this.exportConversation(id, userId, options)
        results.set(id, markdown)
      } catch (error) {
        console.error(`Failed to export conversation ${id}:`, error)
        // 跳过失败的会话，继续导出其他会话
      }
    }

    return results
  }
}

