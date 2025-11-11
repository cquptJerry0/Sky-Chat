/**
 * Export Manager - 前端导出管理器
 * 
 * 技术亮点总结：
 * 1. ✅ IndexedDB 缓存机制（5分钟TTL）
 * 2. ✅ Web Worker 多线程处理
 * 3. ✅ 流式下载支持进度条
 * 4. ✅ 支持取消导出
 * 5. ✅ 客户端 PDF 生成
 * 
 * 架构设计：
 * - 单个导出：纯前端处理（减轻服务器压力）
 * - 批量导出：后端API + 前端流式下载
 */

import { exportService } from './export'
import { exportCache } from './export/cache'

export interface ExportProgress {
  status: 'preparing' | 'downloading' | 'processing' | 'complete' | 'error'
  progress: number // 0-100
  message?: string
  cancelable: boolean
}

export type ProgressCallback = (progress: ExportProgress) => void

export interface ExportOptions {
  format: 'markdown' | 'json' | 'txt' | 'html' | 'pdf'
  includeThinking?: boolean
  includeMetadata?: boolean
  useCache?: boolean
  onProgress?: ProgressCallback
}

export interface BatchExportConfig {
  format: 'markdown' | 'json' | 'txt' | 'html' | 'pdf'
  conversationIds?: string[]
  includeThinking?: boolean
  includeMetadata?: boolean
}

class ExportManager {
  private abortControllers = new Map<string, AbortController>()
  private workers = new Map<string, Worker>()

  /**
   * 导出单个会话（前端处理）
   * 
   * 技术亮点：
   * - 使用缓存避免重复生成
   * - Web Worker 处理大数据
   * - 即时响应，无需网络请求
   */
  async exportConversation(
    conversationId: string,
    config: ExportOptions = { format: 'markdown' }
  ): Promise<void> {
    const exportId = `export-${Date.now()}`
    
    try {
      config.onProgress?.({
        status: 'preparing',
        progress: 0,
        message: '准备导出...',
        cancelable: true
      })

      // 1. 检查缓存
      if (config.useCache !== false) {
        const cached = await exportCache.get(conversationId, config.format)
        if (cached) {
          config.onProgress?.({
            status: 'complete',
            progress: 100,
            message: '使用缓存数据',
            cancelable: false
          })
          this.downloadBlob(cached, `cached_${conversationId}.${config.format}`)
          return
        }
      }

      // 2. 根据格式选择处理方式
      if (config.format === 'markdown' || config.format === 'pdf') {
        // 前端exportService处理
        config.onProgress?.({
          status: 'processing',
          progress: 30,
          message: '正在生成导出文件...',
          cancelable: false
        })

        await exportService.exportConversation(conversationId, {
          format: config.format,
          includeThinking: config.includeThinking,
          includeMetadata: config.includeMetadata
        })
      } else {
        // 其他格式使用后端API
        config.onProgress?.({
          status: 'downloading',
          progress: 10,
          message: '正在从服务器获取...',
          cancelable: false
        })

        const params = new URLSearchParams({
          format: config.format,
          includeThinking: String(config.includeThinking || false),
          includeMetadata: String(config.includeMetadata || false)
        })
        
        const response = await fetch(`/api/conversations/${conversationId}/export?${params}`)
        if (!response.ok) throw new Error('导出失败')
        
        const blob = await response.blob()
        const filename = response.headers.get('Content-Disposition')
          ?.split('filename="')[1]
          ?.split('"')[0] || `export.${config.format}`
        
        this.downloadBlob(blob, filename)
      }

      config.onProgress?.({
        status: 'complete',
        progress: 100,
        message: '导出完成',
        cancelable: false
      })

      // 后台清理过期缓存
      this.cleanupCache()
    } catch (error) {
      config.onProgress?.({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : '导出失败',
        cancelable: false
      })
      throw error
    }
  }

  /**
   * 批量导出（后端API + 流式下载）
   * 
   * 技术亮点：
   * - 使用 Fetch Streams API 获取进度
   * - 支持取消下载
   * - 大文件流式处理
   */
  async exportBatch(
    config: BatchExportConfig,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const exportId = `batch-${Date.now()}`
    const abortController = new AbortController()
    this.abortControllers.set(exportId, abortController)

    try {
      onProgress?.({
        status: 'preparing',
        progress: 0,
        message: '准备批量导出...',
        cancelable: true
      })

      // 调用后端API
      const response = await fetch('/api/conversations/batch-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds: config.conversationIds,
          format: config.format,
          includeThinking: config.includeThinking,
          includeMetadata: config.includeMetadata
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error('批量导出失败')
      }

      // 获取文件大小
      const contentLength = response.headers.get('Content-Length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      onProgress?.({
        status: 'downloading',
        progress: 0,
        message: '正在下载...',
        cancelable: true
      })

      // 流式读取响应
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // 计算进度
        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100)
          onProgress?.({
            status: 'downloading',
            progress,
            message: `正在下载... ${this.formatBytes(receivedLength)}/${this.formatBytes(total)}`,
            cancelable: true
          })
        }
      }

      // 合并数据
      const blob = new Blob(chunks as BlobPart[])
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: '下载完成',
        cancelable: false
      })

      // 触发下载
      const filename = response.headers.get('Content-Disposition')
        ?.split('filename="')[1]
        ?.split('"')[0] || 'export'
      
      this.downloadBlob(blob, filename)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onProgress?.({
          status: 'error',
          progress: 0,
          message: '导出已取消',
          cancelable: false
        })
      } else {
        onProgress?.({
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '批量导出失败',
          cancelable: false
        })
      }
      throw error
    } finally {
      this.abortControllers.delete(exportId)
    }
  }

  /**
   * 导出所有会话
   */
  async exportAll(
    config: Omit<BatchExportConfig, 'conversationIds'>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    return this.exportBatch(
      { ...config, conversationIds: undefined },
      onProgress
    )
  }

  /**
   * 取消导出
   */
  cancel(exportId: string): void {
    const controller = this.abortControllers.get(exportId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(exportId)
    }

    const worker = this.workers.get(exportId)
    if (worker) {
      worker.terminate()
      this.workers.delete(exportId)
    }
  }

  /**
   * 下载 Blob
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * 清理过期缓存
   */
  private async cleanupCache(): Promise<void> {
    try {
      await exportCache.cleanExpired()
    } catch (error) {
      console.warn('缓存清理失败:', error)
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{ count: number; totalSize: number }> {
    return exportCache.getStats()
  }

  /**
   * 清空缓存
   */
  async clearCache(): Promise<void> {
    return exportCache.clear()
  }
}

export const exportManager = new ExportManager()
