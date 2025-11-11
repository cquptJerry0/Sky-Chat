/**
 * Export Manager V2
 * 优化版导出管理器 - 改进性能和用户体验
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

export interface ExportProgress {
  status: 'preparing' | 'downloading' | 'converting' | 'complete' | 'error'
  progress: number // 0-100
  message?: string
}

type ProgressCallback = (progress: ExportProgress) => void

class ExportManagerV2 {
  private cache = new Map<string, { blob: Blob; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存
  private abortControllers = new Map<string, AbortController>()

  /**
   * 导出单个会话（带进度跟踪）
   */
  async exportConversation(
    conversationId: string,
    config: ExportConfig = { format: 'markdown' },
    onProgress?: ProgressCallback
  ): Promise<void> {
    const exportId = `export-${Date.now()}`
    const abortController = new AbortController()
    this.abortControllers.set(exportId, abortController)

    try {
      // 检查缓存
      const cacheKey = this.getCacheKey(conversationId, config)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        onProgress?.({ status: 'complete', progress: 100, message: '使用缓存数据' })
        return this.downloadBlob(cached, this.getFilename(conversationId, config.format))
      }

      // 准备阶段
      onProgress?.({ status: 'preparing', progress: 10, message: '准备导出...' })

      const params = this.buildParams(config)
      const response = await fetch(
        `/api/conversations/${conversationId}/export?${params}`,
        {
          method: 'GET',
          signal: abortController.signal,
          headers: { 'Accept': '*/*' }
        }
      )

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // 下载阶段
      onProgress?.({ status: 'downloading', progress: 30, message: '下载数据...' })
      
      let blob: Blob
      if (config.format === 'pdf' && response.headers.get('content-type')?.includes('html')) {
        // PDF需要转换
        onProgress?.({ status: 'converting', progress: 60, message: '转换为PDF...' })
        blob = await this.convertToPdf(response, onProgress)
      } else {
        // 其他格式直接下载
        blob = await this.downloadWithProgress(response, onProgress)
      }

      // 缓存结果
      this.addToCache(cacheKey, blob)

      // 完成
      onProgress?.({ status: 'complete', progress: 100, message: '导出完成' })
      
      const filename = this.extractFilename(response) || this.getFilename(conversationId, config.format)
      await this.downloadBlob(blob, filename)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onProgress?.({ status: 'error', progress: 0, message: '导出已取消' })
      } else {
        onProgress?.({ status: 'error', progress: 0, message: '导出失败' })
        console.error('Export error:', error)
      }
      throw error
    } finally {
      this.abortControllers.delete(exportId)
    }
  }

  /**
   * 取消导出
   */
  cancelExport(exportId: string): void {
    const controller = this.abortControllers.get(exportId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(exportId)
    }
  }

  /**
   * 批量导出（支持分片下载）
   */
  async exportBatch(
    config: BatchExportConfig = { format: 'json' },
    onProgress?: ProgressCallback
  ): Promise<void> {
    const exportId = `batch-${Date.now()}`
    const abortController = new AbortController()
    this.abortControllers.set(exportId, abortController)

    try {
      onProgress?.({ status: 'preparing', progress: 5, message: '准备批量导出...' })

      const response = await fetch('/api/conversations/batch-export', {
        method: 'POST',
        signal: abortController.signal,
        headers: { 'Content-Type': 'application/json' },
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

      const blob = await this.downloadWithProgress(response, onProgress)
      const filename = this.extractFilename(response) || `batch_export_${Date.now()}.${config.format}`
      
      onProgress?.({ status: 'complete', progress: 100, message: '批量导出完成' })
      await this.downloadBlob(blob, filename)

    } catch (error) {
      onProgress?.({ status: 'error', progress: 0, message: '批量导出失败' })
      throw error
    } finally {
      this.abortControllers.delete(exportId)
    }
  }

  /**
   * 预览导出内容
   */
  async previewExport(
    conversationId: string,
    config: ExportConfig = { format: 'markdown' }
  ): Promise<string> {
    const params = this.buildParams({ ...config, preview: true } as any)
    const response = await fetch(
      `/api/conversations/${conversationId}/export?${params}`,
      { headers: { 'Accept': 'text/plain' } }
    )

    if (!response.ok) {
      throw new Error('Preview failed')
    }

    return response.text()
  }

  /**
   * 带进度的下载
   */
  private async downloadWithProgress(
    response: Response,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    const reader = response.body?.getReader()
    if (!reader) {
      return response.blob()
    }

    const contentLength = Number(response.headers.get('Content-Length')) || 0
    let receivedLength = 0
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      chunks.push(value)
      receivedLength += value.length

      if (onProgress && contentLength > 0) {
        const progress = Math.min(90, 30 + (receivedLength / contentLength) * 60)
        onProgress({
          status: 'downloading',
          progress,
          message: `下载中 ${Math.round((receivedLength / contentLength) * 100)}%`
        })
      }
    }

    return new Blob(chunks)
  }

  /**
   * PDF转换（使用内置库，避免CDN依赖）
   */
  private async convertToPdf(
    response: Response,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    try {
      // 方案1：如果已安装jspdf和html2canvas
      const html = await response.text()
      
      // 检查是否安装了必要的库
      try {
        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')
        
        onProgress?.({ status: 'converting', progress: 70, message: '生成PDF...' })
        
        // 创建临时容器
        const container = document.createElement('div')
        container.innerHTML = html
        container.style.cssText = 'position:absolute;left:-9999px;width:794px;'
        document.body.appendChild(container)
        
        // 转换为canvas
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false
        })
        
        // 生成PDF
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          imgWidth,
          imgHeight
        )
        
        // 清理
        document.body.removeChild(container)
        
        onProgress?.({ status: 'converting', progress: 90, message: 'PDF生成完成' })
        
        return pdf.output('blob')
        
      } catch (importError) {
        // 方案2：降级使用print方法
        console.warn('PDF库未安装，使用浏览器打印功能')
        return this.convertWithPrint(html)
      }
      
    } catch (error) {
      console.error('PDF conversion failed:', error)
      // 降级为HTML
      return new Blob([await response.text()], { type: 'text/html' })
    }
  }

  /**
   * 使用浏览器打印功能转PDF
   */
  private convertWithPrint(html: string): Blob {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>导出预览</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
    
    // 返回HTML blob作为降级方案
    return new Blob([html], { type: 'text/html' })
  }

  /**
   * 下载Blob
   */
  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    // 使用更可靠的下载方法
    if ('showSaveFilePicker' in window) {
      // 使用File System Access API（如果支持）
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: this.getFileTypes(filename)
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (err) {
        // 用户取消或不支持，使用传统方法
      }
    }

    // 传统下载方法
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    
    // 延迟清理，确保下载开始
    setTimeout(() => {
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }, 100)
  }

  /**
   * 缓存管理
   */
  private getCacheKey(conversationId: string, config: ExportConfig): string {
    return `${conversationId}-${JSON.stringify(config)}`
  }

  private getFromCache(key: string): Blob | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.blob
    }
    this.cache.delete(key)
    return null
  }

  private addToCache(key: string, blob: Blob): void {
    this.cache.set(key, { blob, timestamp: Date.now() })
    
    // 自动清理过期缓存
    setTimeout(() => {
      this.cache.delete(key)
    }, this.CACHE_TTL)
  }

  /**
   * 工具方法
   */
  private buildParams(config: any): URLSearchParams {
    const params = new URLSearchParams()
    
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          params.append(key, value.toISOString())
        } else {
          params.append(key, String(value))
        }
      }
    })
    
    return params
  }

  private extractFilename(response: Response): string | null {
    const contentDisposition = response.headers.get('content-disposition')
    if (!contentDisposition) return null

    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
    if (matches && matches[1]) {
      let filename = matches[1].replace(/['"]/g, '')
      try {
        filename = decodeURIComponent(filename)
      } catch {
        // 忽略解码错误
      }
      return filename
    }
    
    return null
  }

  private getFilename(conversationId: string, format: string): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `chat_${conversationId.substring(0, 8)}_${timestamp}.${format}`
  }

  private getFileTypes(filename: string): any[] {
    const ext = filename.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, any> = {
      'pdf': [{ description: 'PDF文档', accept: { 'application/pdf': ['.pdf'] } }],
      'md': [{ description: 'Markdown文档', accept: { 'text/markdown': ['.md'] } }],
      'json': [{ description: 'JSON数据', accept: { 'application/json': ['.json'] } }],
      'txt': [{ description: '文本文件', accept: { 'text/plain': ['.txt'] } }],
      'html': [{ description: 'HTML文档', accept: { 'text/html': ['.html'] } }]
    }
    return typeMap[ext || ''] || []
  }

  /**
   * 清理所有缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    let size = 0
    this.cache.forEach(item => {
      size += item.blob.size
    })
    return size
  }
}

export const exportManagerV2 = new ExportManagerV2()
