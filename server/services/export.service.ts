/**
 * Export Service
 * 导出服务 - 处理聊天记录的多格式导出
 */

import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { MessageRepository } from '@/server/repositories/message.repository'
import type { Message, Conversation } from '@prisma/client'

export interface ExportOptions {
  format: 'markdown' | 'json' | 'txt' | 'html' | 'pdf'
  includeThinking?: boolean
  includeMetadata?: boolean
  dateRange?: {
    start?: Date
    end?: Date
  }
}

export interface ExportedData {
  conversation: Conversation
  messages: Message[]
  metadata?: {
    exportedAt: Date
    messageCount: number
    format: string
  }
}

class ExportService {
  /**
   * 导出单个会话
   */
  async exportConversation(
    conversationId: string,
    userId: string,
    options: ExportOptions
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    // 验证权限
    const conversation = await ConversationRepository.findById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    // 获取消息
    const messages = await MessageRepository.findByConversationId(conversationId)

    // 过滤日期范围（如果指定）
    const filteredMessages = this.filterByDateRange(messages, options.dateRange)

    // 根据格式导出
    const exportData: ExportedData = {
      conversation,
      messages: filteredMessages,
      metadata: options.includeMetadata ? {
        exportedAt: new Date(),
        messageCount: filteredMessages.length,
        format: options.format
      } : undefined
    }

    return this.formatData(exportData, options)
  }

  /**
   * 批量导出会话
   */
  async exportBatch(
    conversationIds: string[],
    userId: string,
    options: ExportOptions
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const exportedConversations: ExportedData[] = []

    for (const id of conversationIds) {
      const conversation = await ConversationRepository.findById(id, userId)
      if (conversation) {
        const messages = await MessageRepository.findByConversationId(id)
        exportedConversations.push({
          conversation,
          messages: this.filterByDateRange(messages, options.dateRange)
        })
      }
    }

    return this.formatBatchData(exportedConversations, options)
  }

  /**
   * 导出所有会话
   */
  async exportAll(userId: string, options: ExportOptions) {
    const conversations = await ConversationRepository.findByUserId(userId)
    const conversationIds = conversations.map((c: { id: string }) => c.id)
    return this.exportBatch(conversationIds, userId, options)
  }

  /**
   * 格式化数据
   */
  private formatData(
    data: ExportedData,
    options: ExportOptions
  ): { content: string; filename: string; mimeType: string } {
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFilename = `${data.conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`

    switch (options.format) {
      case 'markdown':
        return {
          content: this.toMarkdown(data, options),
          filename: `${baseFilename}.md`,
          mimeType: 'text/markdown'
        }
      
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          filename: `${baseFilename}.json`,
          mimeType: 'application/json'
        }
      
      case 'txt':
        return {
          content: this.toPlainText(data, options),
          filename: `${baseFilename}.txt`,
          mimeType: 'text/plain'
        }
      
      case 'html':
        return {
          content: this.toHTML(data, options),
          filename: `${baseFilename}.html`,
          mimeType: 'text/html'
        }
      
      case 'pdf':
        // PDF需要使用专门的库如 puppeteer 或 pdfkit
        // 这里返回HTML，前端再转换为PDF
        return {
          content: this.toHTML(data, options),
          filename: `${baseFilename}.pdf`,
          mimeType: 'application/pdf'
        }
      
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }
  }

  /**
   * 批量格式化
   */
  private formatBatchData(
    data: ExportedData[],
    options: ExportOptions
  ): { content: string; filename: string; mimeType: string } {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `sky_chat_export_${timestamp}`

    switch (options.format) {
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          filename: `${filename}.json`,
          mimeType: 'application/json'
        }
      
      case 'markdown':
        const mdContent = data.map(d => this.toMarkdown(d, options)).join('\n\n---\n\n')
        return {
          content: mdContent,
          filename: `${filename}.md`,
          mimeType: 'text/markdown'
        }
      
      // 其他格式类似处理
      default:
        return this.formatData(data[0], options)
    }
  }

  /**
   * 转换为Markdown格式
   */
  private toMarkdown(data: ExportedData, options: ExportOptions): string {
    let content = `# ${data.conversation.title}\n\n`
    
    if (options.includeMetadata && data.metadata) {
      content += `> 导出时间：${data.metadata.exportedAt.toLocaleString()}\n`
      content += `> 消息数量：${data.metadata.messageCount}\n\n`
    }

    content += `---\n\n`

    for (const msg of data.messages) {
      const role = msg.role === 'user' ? '👤     用户' : '🤖 助手'
      content += `### ${role}\n`
      content += `*${new Date(msg.createdAt).toLocaleString()}*\n\n`
      
      if (options.includeThinking && msg.thinking) {
        content += `<details>\n<summary>思考过程</summary>\n\n`
        content += `${msg.thinking}\n\n`
        content += `</details>\n\n`
      }
      
      content += `${msg.content}\n\n`
      content += `---\n\n`
    }

    return content
  }

  /**
   * 转换为纯文本
   */
  private toPlainText(data: ExportedData, options: ExportOptions): string {
    let content = `${data.conversation.title}\n`
    content += `${'='.repeat(50)}\n\n`

    for (const msg of data.messages) {
      const role = msg.role === 'user' ? '用户' : '助手'
      content += `[${role}] ${new Date(msg.createdAt).toLocaleString()}\n`
      
      if (options.includeThinking && msg.thinking) {
        content += `思考：${msg.thinking}\n`
      }
      
      content += `${msg.content}\n`
      content += `${'-'.repeat(50)}\n\n`
    }

    return content
  }

  /**
   * 转换为HTML格式
   */
  private toHTML(data: ExportedData, options: ExportOptions): string {
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.conversation.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .conversation {
      background: white;
      border-radius: 8px;
      padding: 20px;
    }
    .message {
      margin-bottom: 20px;
      padding: 15px;
      border-radius: 8px;
    }
    .user-message {
      background: #e3f2fd;
      margin-left: 40px;
    }
    .assistant-message {
      background: #f5f5f5;
      margin-right: 40px;
    }
    .message-header {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .thinking {
      background: #fffde7;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 14px;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 10px;
    }
    .metadata {
      font-size: 12px;
      color: #666;
      margin-bottom: 20px;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="conversation">
    <h1>${data.conversation.title}</h1>
    ${options.includeMetadata && data.metadata ? `
    <div class="metadata">
      <p>导出时间：${data.metadata.exportedAt.toLocaleString()}</p>
      <p>消息数量：${data.metadata.messageCount}</p>
    </div>
    ` : ''}
    ${data.messages.map(msg => `
    <div class="message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}">
      <div class="message-header">
        ${msg.role === 'user' ? '👤 用户' : '🤖 助手'} - ${new Date(msg.createdAt).toLocaleString()}
      </div>
      <div class="message-content">${this.escapeHtml(msg.content)}</div>
      ${options.includeThinking && msg.thinking ? `
      <details class="thinking">
        <summary>思考过程</summary>
        <p>${this.escapeHtml(msg.thinking)}</p>
      </details>
      ` : ''}
    </div>
    `).join('')}
  </div>
</body>
</html>`

    return htmlContent
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * 日期范围过滤
   */
  private filterByDateRange(
    messages: Message[],
    dateRange?: { start?: Date; end?: Date }
  ): Message[] {
    if (!dateRange) return messages

    return messages.filter(msg => {
      const msgDate = new Date(msg.createdAt)
      if (dateRange.start && msgDate < dateRange.start) return false
      if (dateRange.end && msgDate > dateRange.end) return false
      return true
    })
  }
}

export const exportService = new ExportService()
