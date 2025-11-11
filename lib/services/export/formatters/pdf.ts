/**
 * PDF 格式化器
 * 将会话数据转换为 PDF
 * 使用 jsPDF 库生成 PDF
 */

import type { ConversationData, ExportConfig, Formatter, MessageData } from '../types'

export class PdfFormatter implements Formatter {
  async format(data: ConversationData, config: ExportConfig): Promise<Blob> {
    // 先生成HTML内容
    const html = this.generateHtml(data, config)
    
    // 转换为PDF
    return this.htmlToPdf(html)
  }
  
  private generateHtml(data: ConversationData, config: ExportConfig): string {
    let html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>${this.escapeHtml(data.title)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { 
          font-size: 24px; 
          margin-bottom: 20px; 
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
        }
        h2 { 
          font-size: 18px; 
          margin: 20px 0 10px; 
        }
        h3 { 
          font-size: 16px; 
          margin: 15px 0 8px;
          color: #555;
        }
        .metadata {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .metadata li {
          list-style: none;
          margin: 5px 0;
        }
        .message {
          margin: 20px 0;
          padding: 15px;
          border-left: 3px solid #e0e0e0;
        }
        .message.user {
          border-left-color: #4CAF50;
          background: #f8fff9;
        }
        .message.assistant {
          border-left-color: #2196F3;
          background: #f3f9ff;
        }
        .message-header {
          font-weight: bold;
          color: #666;
          margin-bottom: 8px;
        }
        .message-time {
          font-size: 12px;
          color: #999;
          margin-bottom: 10px;
        }
        .message-content {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .thinking {
          background: #fff9e6;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .thinking-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .divider {
          height: 1px;
          background: #e0e0e0;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #999;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>${this.escapeHtml(data.title)}</h1>
    `
    
    // 元数据
    if (config.includeMetadata) {
      html += `
      <div class="metadata">
        <h2>会话信息</h2>
        <ul>
          <li><strong>会话ID:</strong> ${data.id}</li>
          <li><strong>创建时间:</strong> ${new Date(data.createdAt).toLocaleString('zh-CN')}</li>
          <li><strong>更新时间:</strong> ${new Date(data.updatedAt).toLocaleString('zh-CN')}</li>
          <li><strong>消息数量:</strong> ${data.messages.length}</li>
        </ul>
      </div>
      `
    }
    
    // 消息列表
    data.messages.forEach(message => {
      html += this.formatMessageHtml(message, config)
    })
    
    // 页脚
    if (config.includeTimestamp) {
      html += `
      <div class="footer">
        导出时间: ${new Date().toLocaleString('zh-CN')}
      </div>
      `
    }
    
    html += `
    </body>
    </html>
    `
    
    return html
  }
  
  private formatMessageHtml(message: MessageData, config: ExportConfig): string {
    const roleClass = message.role === 'user' ? 'user' : 'assistant'
    const roleLabel = message.role === 'user' ? '用户' : message.role === 'assistant' ? '助手' : '系统'
    
    let html = `<div class="message ${roleClass}">`
    html += `<div class="message-header">${roleLabel}</div>`
    
    if (config.includeTimestamp) {
      html += `<div class="message-time">${new Date(message.createdAt).toLocaleString('zh-CN')}</div>`
    }
    
    // 思考过程
    if (config.includeThinking && message.thinking) {
      html += `
      <div class="thinking">
        <div class="thinking-label">思考过程：</div>
        <div>${this.escapeHtml(message.thinking)}</div>
      </div>
      `
    }
    
    html += `<div class="message-content">${this.escapeHtml(message.content)}</div>`
    html += `</div>`
    
    return html
  }
  
  private async htmlToPdf(html: string): Promise<Blob> {
    // 检查是否支持动态导入
    try {
      // 动态导入 jsPDF
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      // 设置字体
      pdf.setFont('helvetica')
      pdf.setFontSize(12)
      
      // 简单的文本布局（生产环境建议使用 html2canvas 或服务端渲染）
      // 这里提供一个简化版实现
      const lines = this.htmlToText(html).split('\n')
      let y = 20
      const pageHeight = pdf.internal.pageSize.height
      
      lines.forEach(line => {
        if (y > pageHeight - 20) {
          pdf.addPage()
          y = 20
        }
        pdf.text(line, 10, y)
        y += 7
      })
      
      return pdf.output('blob')
      
    } catch (error) {
      console.error('PDF生成失败，降级为HTML Blob:', error)
      // 如果jsPDF不可用，返回HTML blob
      return new Blob([html], { type: 'text/html' })
    }
  }
  
  private htmlToText(html: string): string {
    // 简单的HTML转文本（移除标签）
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }
  
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
}
