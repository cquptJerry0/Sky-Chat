/**
 * Export Manager
 * 前端导出管理器 - 处理文件下载和导出操作
 */

export interface ExportConfig {
  format: 'markdown' | 'json' | 'txt' | 'html' | 'pdf'
  includeThinking?: boolean
  includeMetadata?: boolean
  dateRange?: {
    start?: Date
    end?: Date
  }
}

export interface BatchExportConfig extends ExportConfig {
  conversationIds?: string[]
}

class ExportManager {
  /**
   * 导出单个会话
   */
  async exportConversation(
    conversationId: string,
    config: ExportConfig = { format: 'markdown' }
  ): Promise<void> {
    try {
      const params = new URLSearchParams({
        format: config.format,
        includeThinking: String(config.includeThinking || false),
        includeMetadata: String(config.includeMetadata || false)
      })

      if (config.dateRange?.start) {
        params.append('startDate', config.dateRange.start.toISOString())
      }
      if (config.dateRange?.end) {
        params.append('endDate', config.dateRange.end.toISOString())
      }

      const response = await fetch(
        `/api/conversations/${conversationId}/export?${params}`,
        {
          method: 'GET',
          headers: {
            'Accept': '*/*'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // 处理PDF特殊情况（需要前端转换）
      if (config.format === 'pdf') {
        await this.handlePdfExport(response)
      } else {
        // 其他格式直接下载
        await this.downloadFile(response)
      }
    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  }

  /**
   * 批量导出会话
   */
  async exportBatch(config: BatchExportConfig = { format: 'json' }): Promise<void> {
    try {
      const response = await fetch('/api/conversations/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationIds: config.conversationIds,
          format: config.format,
          includeThinking: config.includeThinking || false,
          includeMetadata: config.includeMetadata || true,
          dateRange: config.dateRange
        })
      })

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`)
      }

      await this.downloadFile(response)
    } catch (error) {
      console.error('Batch export error:', error)
      throw error
    }
  }

  /**
   * 导出所有会话
   */
  async exportAll(config: ExportConfig = { format: 'json' }): Promise<void> {
    return this.exportBatch({ ...config, conversationIds: undefined })
  }

  /**
   * 处理文件下载
   */
  private async downloadFile(response: Response): Promise<void> {
    try {
      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const filename = this.extractFilename(contentDisposition) || 'export.txt'

      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      
      // 清理
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }

  /**
   * 处理PDF导出（需要前端转换）
   */
  private async handlePdfExport(response: Response): Promise<void> {
    try {
      const html = await response.text()
      
      // 动态加载 html2pdf 库
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdfLib = await this.loadHtml2Pdf() as any
      
      // 配置PDF选项
      const options = {
        margin: [10, 10],
        filename: 'chat-export.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      
      // 生成并下载PDF
      await html2pdfLib().set(options).from(html).save()
    } catch (error) {
      console.error('PDF export error:', error)
      // 降级为HTML下载
      const blob = new Blob([await response.text()], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'chat-export.html'
      link.click()
      window.URL.revokeObjectURL(url)
    }
  }

  /**
   * 动态加载 html2pdf 库
   */
  private async loadHtml2Pdf(): Promise<unknown> {
    // 检查是否已加载
    const win = window as Window & { html2pdf?: unknown }
    if (win.html2pdf) {
      return win.html2pdf
    }

    // 动态创建script标签加载库
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = () => {
        const updatedWin = window as Window & { html2pdf?: unknown }
        resolve(updatedWin.html2pdf)
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  /**
   * 从Content-Disposition头提取文件名
   */
  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null

    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    const matches = filenameRegex.exec(contentDisposition)
    
    if (matches && matches[1]) {
      let filename = matches[1].replace(/['"]/g, '')
      // 解码URL编码的文件名
      try {
        filename = decodeURIComponent(filename)
      } catch {
        // 忽略解码错误
      }
      return filename
    }
    
    return null
  }
}

export const exportManager = new ExportManager()
