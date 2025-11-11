/**
 * 前端导出服务
 * 纯前端实现的导出功能，支持 Markdown 和 PDF 格式
 */

import { useChatStore } from '@/lib/stores/chat.store'
import type { ConversationData, ExportConfig, ExportResult, MessageData } from './types'
import { MarkdownFormatter } from './formatters/markdown'
import { PdfFormatter } from './formatters/pdf'

export class ExportService {
  private markdownFormatter = new MarkdownFormatter()
  private pdfFormatter = new PdfFormatter()
  
  /**
   * 导出当前会话
   */
  async exportCurrentConversation(config: ExportConfig = { format: 'markdown' }): Promise<void> {
    const store = useChatStore.getState()
    const conversationId = store.currentConversationId
    
    if (!conversationId) {
      throw new Error('没有选中的会话')
    }
    
    // 获取会话数据
    const data = await this.getConversationData(conversationId)
    
    // 导出
    return this.export(data, config)
  }
  
  /**
   * 导出指定会话
   */
  async exportConversation(conversationId: string, config: ExportConfig = { format: 'markdown' }): Promise<void> {
    const data = await this.getConversationData(conversationId)
    return this.export(data, config)
  }
  
  /**
   * 执行导出
   */
  private async export(data: ConversationData, config: ExportConfig): Promise<void> {
    const result = await this.generateExport(data, config)
    this.downloadFile(result)
  }
  
  /**
   * 生成导出内容
   */
  private async generateExport(data: ConversationData, config: ExportConfig): Promise<ExportResult> {
    let blob: Blob
    let mimeType: string
    let extension: string
    
    switch (config.format) {
      case 'markdown':
        const markdown = this.markdownFormatter.format(data, config)
        blob = new Blob([markdown], { type: 'text/markdown' })
        mimeType = 'text/markdown'
        extension = 'md'
        break
        
      case 'pdf':
        blob = await this.pdfFormatter.format(data, config)
        mimeType = blob.type === 'text/html' ? 'text/html' : 'application/pdf'
        extension = blob.type === 'text/html' ? 'html' : 'pdf'
        break
        
      default:
        throw new Error(`不支持的格式: ${config.format}`)
    }
    
    const filename = this.generateFilename(data.title, extension)
    
    return { blob, filename, mimeType }
  }
  
  /**
   * 获取会话数据
   * 可以从 store 获取或从 API 获取
   */
  private async getConversationData(conversationId: string): Promise<ConversationData> {
    const store = useChatStore.getState()
    
    // 如果是当前会话，直接从 store 获取
    if (store.currentConversationId === conversationId) {
      const conversation = store.conversations.find(c => c.id === conversationId)
      
      if (!conversation) {
        throw new Error('会话不存在')
      }
      
      return {
        id: conversation.id,
        title: conversation.title,
        messages: store.messages.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          thinking: m.thinking,
          createdAt: new Date().toISOString() // 如果消息没有时间戳，使用当前时间
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    }
    
    // 否则从 API 获取
    return this.fetchConversationData(conversationId)
  }
  
  /**
   * 从 API 获取会话数据
   */
  private async fetchConversationData(conversationId: string): Promise<ConversationData> {
    try {
      // 获取会话详情
      const conversationRes = await fetch(`/api/conversations/${conversationId}`)
      if (!conversationRes.ok) {
        throw new Error('获取会话失败')
      }
      const { conversation } = await conversationRes.json()
      
      // 获取消息列表
      const messagesRes = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!messagesRes.ok) {
        throw new Error('获取消息失败')
      }
      const { messages } = await messagesRes.json()
      
      return {
        id: conversation.id,
        title: conversation.title,
        messages: messages.map((m: MessageData) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          thinking: m.thinking,
          createdAt: m.createdAt
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    } catch (error) {
      console.error('获取会话数据失败:', error)
      throw error
    }
  }
  
  /**
   * 生成文件名
   */
  private generateFilename(title: string, extension: string): string {
    // 清理文件名（移除特殊字符）
    const cleanTitle = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '_')
    const timestamp = new Date().toISOString().split('T')[0]
    return `${cleanTitle}_${timestamp}.${extension}`
  }
  
  /**
   * 下载文件
   */
  private downloadFile(result: ExportResult): void {
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  }
}

// 导出单例
export const exportService = new ExportService()

// 导出类型
export type { ExportConfig, ExportFormat, ConversationData, MessageData, ExportResult } from './types'
