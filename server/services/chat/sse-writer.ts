/**
 * SSE 事件写入器
 * 
 * 封装 SSE 事件的发送逻辑，统一事件格式
 */

import type { ToolCall } from '@/server/services/tools'

/** 搜索来源类型 */
export interface SearchSource {
  title: string
  url: string
  snippet?: string
}

/** 工具结果数据 */
export interface ToolResultData {
  toolCallId: string
  name: string
  result: {
    success: boolean
    imageUrl?: string
    width?: number
    height?: number
    resultCount?: number
    sources?: SearchSource[]
    cancelled?: boolean
  }
}

/**
 * SSE 事件写入器
 */
export class SSEWriter {
  private _controller: ReadableStreamDefaultController
  private _encoder: TextEncoder
  private _sessionId: string
  private _closed = false

  constructor(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    sessionId: string
  ) {
    this._controller = controller
    this._encoder = encoder
    this._sessionId = sessionId
  }

  /**
   * 发送原始事件
   */
  private _send(data: Record<string, unknown>): void {
    if (this._closed) return
    try {
      this._controller.enqueue(
        this._encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
      )
    } catch {
      // Controller 已关闭，标记为关闭状态
      this._closed = true
    }
  }

  /**
   * 发送 thinking 内容
   */
  sendThinking(content: string): void {
    this._send({ type: 'thinking', content, sessionId: this._sessionId })
  }

  /**
   * 发送 answer 内容
   */
  sendAnswer(content: string): void {
    this._send({ type: 'answer', content, sessionId: this._sessionId })
  }

  /**
   * 发送工具调用开始事件
   */
  sendToolCall(tc: ToolCall): void {
    const toolName = tc.function.name
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(tc.function.arguments)
    } catch {
      // ignore
    }

    const event: Record<string, unknown> = {
      type: 'tool_call',
      toolCallId: tc.id,
      name: toolName,
      sessionId: this._sessionId,
    }

    if (toolName === 'web_search') {
      event.query = args.query as string
    } else if (toolName === 'generate_image') {
      event.prompt = args.prompt as string
    }

    this._send(event)
  }

  /**
   * 发送工具进度事件
   */
  sendToolProgress(toolCallId: string, progress: number): void {
    this._send({
      type: 'tool_progress',
      toolCallId,
      progress,
      sessionId: this._sessionId,
    })
  }

  /**
   * 发送工具结果事件并返回持久化数据
   */
  sendToolResult(result: {
    toolCallId: string
    name: string
    success: boolean
    content: string
  }): ToolResultData {
    if (result.name === 'web_search') {
      return this._sendWebSearchResult(result)
    } else if (result.name === 'generate_image') {
      return this._sendImageResult(result)
    } else {
      return this._sendGenericResult(result)
    }
  }

  private _sendWebSearchResult(result: {
    toolCallId: string
    name: string
    success: boolean
    content: string
  }): ToolResultData {
    let resultCount = 0
    let sources: SearchSource[] = []
    try {
      const parsed = JSON.parse(result.content)
      resultCount = parsed.resultCount || 0
      sources = parsed.sources || []
    } catch {
      resultCount = result.success ? 1 : 0
    }

    this._send({
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: 'web_search',
      resultCount,
      sources,
      success: result.success,
      sessionId: this._sessionId,
    })

    return {
      toolCallId: result.toolCallId,
      name: 'web_search',
      result: { success: result.success, resultCount, sources },
    }
  }

  private _sendImageResult(result: {
    toolCallId: string
    name: string
    success: boolean
    content: string
  }): ToolResultData {
    let imageUrl: string | undefined
    let width: number | undefined
    let height: number | undefined

    if (result.success) {
      try {
        const parsed = JSON.parse(result.content)
        imageUrl = parsed.url
        width = parsed.width
        height = parsed.height
      } catch {
        // 忽略解析错误
      }
    }

    this._send({
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: 'generate_image',
      success: result.success,
      imageUrl,
      width,
      height,
      sessionId: this._sessionId,
    })

    return {
      toolCallId: result.toolCallId,
      name: 'generate_image',
      result: { success: result.success, imageUrl, width, height },
    }
  }

  private _sendGenericResult(result: {
    toolCallId: string
    name: string
    success: boolean
    content: string
  }): ToolResultData {
    this._send({
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: result.name,
      success: result.success,
      sessionId: this._sessionId,
    })

    return {
      toolCallId: result.toolCallId,
      name: result.name,
      result: { success: result.success },
    }
  }

  /**
   * 发送慢速任务结果
   */
  sendSlowTaskResult(
    toolCallId: string,
    name: string,
    result: {
      success: boolean
      imageUrl?: string
      width?: number
      height?: number
      cancelled?: boolean
    }
  ): void {
    this._send({
      type: 'tool_result',
      toolCallId,
      name,
      success: result.success,
      imageUrl: result.imageUrl,
      width: result.width,
      height: result.height,
      cancelled: result.cancelled,
      sessionId: this._sessionId,
    })
  }

  /**
   * 发送完成信号
   */
  sendComplete(): void {
    if (this._closed) return
    this._send({ type: 'complete', sessionId: this._sessionId })
    try {
      this._controller.enqueue(this._encoder.encode('data: [DONE]\n\n'))
    } catch {
      // Controller 已关闭，忽略
    }
  }

  /**
   * 关闭流
   */
  close(): void {
    if (this._closed) return
    this._closed = true
    try {
      this._controller.close()
    } catch {
      // 已关闭，忽略
    }
  }

  /**
   * 报告错误
   */
  error(err: unknown): void {
    if (this._closed) return
    this._closed = true
    try {
      this._controller.error(err)
    } catch {
      // 已关闭，忽略
    }
  }
}
