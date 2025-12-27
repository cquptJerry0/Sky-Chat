/**
 * SSE 事件写入器
 */

import type { ToolCall } from '@/server/services/tools'

/**
 * SSE 事件写入器
 */
export class SSEWriter {
  private _controller: ReadableStreamDefaultController
  private _encoder: TextEncoder
  private _sessionId: string
  private _closed = false

  constructor(controller: ReadableStreamDefaultController, encoder: TextEncoder, sessionId: string) {
    this._controller = controller
    this._encoder = encoder
    this._sessionId = sessionId
  }

  private _send(data: Record<string, unknown>): void {
    if (this._closed) return
    try {
      this._controller.enqueue(this._encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    } catch {
      this._closed = true
    }
  }

  sendThinking(content: string): void {
    this._send({ type: 'thinking', content, sessionId: this._sessionId })
  }

  sendAnswer(content: string): void {
    this._send({ type: 'answer', content, sessionId: this._sessionId })
  }

  sendToolCall(tc: ToolCall): void {
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }

    const event: Record<string, unknown> = {
      type: 'tool_call',
      toolCallId: tc.id,
      name: tc.function.name,
      sessionId: this._sessionId,
    }

    if (tc.function.name === 'web_search') event.query = args.query
    if (tc.function.name === 'generate_image') event.prompt = args.prompt

    this._send(event)
  }

  sendToolProgress(toolCallId: string, progress: number): void {
    this._send({ type: 'tool_progress', toolCallId, progress, sessionId: this._sessionId })
  }

  sendToolResult(result: { toolCallId: string; name: string; success: boolean; content: string }): void {
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(result.content) } catch { /* ignore */ }

    const event: Record<string, unknown> = {
      type: 'tool_result',
      toolCallId: result.toolCallId,
      name: result.name,
      success: result.success,
      sessionId: this._sessionId,
    }

    if (result.name === 'web_search') {
      event.resultCount = parsed.resultCount || 0
      event.sources = parsed.sources || []
    }
    if (result.name === 'generate_image') {
      event.imageUrl = parsed.url
      event.width = parsed.width
      event.height = parsed.height
    }

    this._send(event)
  }

  sendComplete(): void {
    if (this._closed) return
    this._send({ type: 'complete', sessionId: this._sessionId })
    try { this._controller.enqueue(this._encoder.encode('data: [DONE]\n\n')) } catch { /* ignore */ }
  }

  close(): void {
    if (this._closed) return
    this._closed = true
    try { this._controller.close() } catch { /* ignore */ }
  }

  error(err: unknown): void {
    if (this._closed) return
    this._closed = true
    try { this._controller.error(err) } catch { /* ignore */ }
  }
}
