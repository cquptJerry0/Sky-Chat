import type { SSEData } from '@/features/chat/types/chat'

/**
 * SSE 消息解析器
 *
 * 职责：
 * 1. 解析 SSE 流
 * 2. 区分 thinking / answer / tool_calls
 * 3. 返回标准化的数据
 */

export interface SSECallbacks {
  onData: (data: SSEData) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

export class SSEParser {
  /**
   * 解析单行 SSE 数据
   */
  static parseLine(line: string): SSEData | null {
    if (!line.startsWith('data: ')) return null

    const data = line.slice(6).trim()
    if (data === '[DONE]') return { type: 'complete' }

    try {
      return JSON.parse(data) as SSEData
    } catch (error) {
      console.error('[SSEParser] Failed to parse SSE data:', data, error)
      return null
    }
  }

  /**
   * 处理 SSE 流，使用回调函数
   */
  static async parseStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: SSECallbacks
  ): Promise<void> {
    const decoder = new TextDecoder()
    let buffer = '' // 用于存储跨 chunk 的不完整数据

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          // 处理剩余的 buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n')
            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                const parsed = SSEParser.parseLine(line)
                if (parsed) callbacks.onData(parsed)
              }
            }
          }
          callbacks.onComplete?.()
          return
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 按行分割，但保留最后一行（可能不完整）
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一行到 buffer

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const parsed = SSEParser.parseLine(line)
            if (parsed) callbacks.onData(parsed)
          }
        }
      }
    } catch (error) {
      // AbortError 是正常的中断，静默完成而不是报错
      if (error instanceof Error && error.name === 'AbortError') {
        callbacks.onComplete?.()
        return
      }
      callbacks.onError?.(error as Error)
      throw error
    }
  }
}

