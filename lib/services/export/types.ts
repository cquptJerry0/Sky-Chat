/**
 * 导出功能类型定义
 */

// 导出格式
export type ExportFormat = 'markdown' | 'pdf'

// 导出配置
export interface ExportConfig {
  format: ExportFormat
  includeThinking?: boolean
  includeTimestamp?: boolean
  includeMetadata?: boolean
}

// 会话数据
export interface ConversationData {
  id: string
  title: string
  messages: MessageData[]
  createdAt: string
  updatedAt: string
}

// 消息数据
export interface MessageData {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  createdAt: string
}

// 格式化器接口
export interface Formatter {
  format(data: ConversationData, config: ExportConfig): string | Promise<Blob>
}

// 导出结果
export interface ExportResult {
  blob: Blob
  filename: string
  mimeType: string
}
