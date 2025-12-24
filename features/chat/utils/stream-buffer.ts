/**
 * StreamBuffer - 流式内容缓冲器
 * 
 * 将高频 SSE chunk 缓冲后通过 requestAnimationFrame 批量刷新，
 * 将渲染频次从 80-120 次/秒收敛至 ≤60 次/秒
 */

export interface StreamBufferOptions {
  onFlush: (content: string) => void
}

export class StreamBuffer {
  private buffer: string = ''
  private rafId: number | null = null
  private onFlush: (content: string) => void
  private isSSR: boolean

  constructor(options: StreamBufferOptions) {
    this.onFlush = options.onFlush
    this.isSSR = typeof window === 'undefined'
  }

  /**
   * 追加内容到缓冲区
   * SSR 环境下直接 flush，客户端环境下调度 rAF
   */
  append(chunk: string): void {
    this.buffer += chunk
    
    if (this.isSSR) {
      // SSR: 直接 flush，不使用 rAF
      this.flush()
    } else {
      // 客户端: 调度 rAF 批量刷新
      this.scheduleFlush()
    }
  }

  /**
   * 调度下一帧刷新
   * 如果已有待处理的 rAF，跳过（幂等性）
   */
  private scheduleFlush(): void {
    if (this.rafId !== null) return
    
    this.rafId = requestAnimationFrame(() => {
      this.flush()
      this.rafId = null
    })
  }

  /**
   * 执行刷新
   * 将缓冲区内容一次性传递给 onFlush 回调
   */
  private flush(): void {
    if (this.buffer) {
      this.onFlush(this.buffer)
      this.buffer = ''
    }
  }

  /**
   * 强制刷新
   * 流结束或中断时调用，确保所有内容被渲染
   */
  forceFlush(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.flush()
  }

  /**
   * 销毁实例
   * 清理资源，防止内存泄漏
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.buffer = ''
  }
}
