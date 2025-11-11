/**
 * Markdown 格式化器
 * 将会话数据转换为 Markdown 格式
 */

import type { ConversationData, ExportConfig, Formatter, MessageData } from '../types'

export class MarkdownFormatter implements Formatter {
  format(data: ConversationData, config: ExportConfig): string {
    let content = ''
    
    // 标题
    content += `# ${data.title}\n\n`
    
    // 元数据（可选）
    if (config.includeMetadata) {
      content += this.formatMetadata(data)
      content += '\n---\n\n'
    }
    
    // 消息列表
    data.messages.forEach(message => {
      content += this.formatMessage(message, config)
      content += '\n---\n\n'
    })
    
    // 导出信息
    if (config.includeTimestamp) {
      content += `\n_导出时间: ${new Date().toLocaleString('zh-CN')}_\n`
    }
    
    return content
  }
  
  private formatMetadata(data: ConversationData): string {
    let metadata = '## 会话信息\n\n'
    metadata += `- **会话ID**: ${data.id}\n`
    metadata += `- **创建时间**: ${new Date(data.createdAt).toLocaleString('zh-CN')}\n`
    metadata += `- **更新时间**: ${new Date(data.updatedAt).toLocaleString('zh-CN')}\n`
    metadata += `- **消息数量**: ${data.messages.length}\n`
    return metadata
  }
  
  private formatMessage(message: MessageData, config: ExportConfig): string {
    let content = ''
    
    // 角色标题
    const roleLabel = message.role === 'user' ? '用户' : message.role === 'assistant' ? '助手' : '系统'
    content += `### ${roleLabel}\n\n`
    
    // 时间戳（可选）
    if (config.includeTimestamp) {
      content += `_${new Date(message.createdAt).toLocaleString('zh-CN')}_\n\n`
    }
    
    // 思考过程（如果有）
    if (config.includeThinking && message.thinking) {
      content += '**思考过程：**\n\n'
      content += '```\n'
      content += message.thinking
      content += '\n```\n\n'
      content += '**回答：**\n\n'
    }
    
    // 消息内容
    content += message.content + '\n'
    
    return content
  }
}
