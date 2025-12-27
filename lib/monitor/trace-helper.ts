/**
 * 埋点辅助模块
 *
 * 封装所有埋点逻辑，让 chat.service 保持简洁
 * 所有方法都是安全的，Monitor 未初始化时静默返回
 */

'use client'

import type { ToolResult } from '@jerry_aurora/sky-monitor-sdk'
import { getMonitor } from './index'

/**
 * 创建并启动 Trace
 * @param aiMessageId - AI 消息 ID
 * @param previousTraceId - 重试时的原 Trace ID
 */
export function startTrace(aiMessageId: string, previousTraceId?: string): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.createTrace({ aiMessageId, previousTraceId })
    monitor.setCurrentTrace(trace)
    trace.start()

    // 统计对话次数
    const session = monitor.getSession()
    if (session) {
      session.incrementTraceCount()
    }
  } catch (e) {
    console.warn('[TraceHelper] startTrace failed:', e)
  }
}

/**
 * 结束当前 Trace
 * @param reason - 结束原因
 * @param errorMsg - 错误信息（仅 error 时需要）
 */
export function endTrace(
  reason: 'complete' | 'error' | 'abort',
  errorMsg?: string
): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    switch (reason) {
      case 'complete':
        trace.complete()
        break
      case 'error':
        trace.error(errorMsg || 'Unknown error')
        break
      case 'abort':
        trace.abort(errorMsg || 'user_cancel')
        break
    }

    monitor.setCurrentTrace(null)
  } catch (e) {
    console.warn('[TraceHelper] endTrace failed:', e)
  }
}

/**
 * 获取当前 Trace ID
 */
export function getCurrentTraceId(): string | undefined {
  try {
    const monitor = getMonitor()
    if (!monitor) return undefined

    const trace = monitor.getCurrentTrace()
    return trace?.traceId
  } catch {
    return undefined
  }
}

/**
 * 记录首个 chunk（TTFB）
 */
export function recordFirstChunk(): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    trace.firstChunk()
  } catch (e) {
    console.warn('[TraceHelper] recordFirstChunk failed:', e)
  }
}

/**
 * 记录 chunk（用于 stall 检测）
 */
export function recordChunk(): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    trace.recordChunk()
  } catch {
    // 静默失败，chunk 记录非常频繁
  }
}

/**
 * 阶段开始
 * @param phase - 阶段名称
 */
export function startPhase(phase: 'thinking' | 'answer'): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    trace.phaseStart(phase)
  } catch (e) {
    console.warn('[TraceHelper] startPhase failed:', e)
  }
}

/**
 * 阶段结束
 * @param phase - 阶段名称
 */
export function endPhase(phase: 'thinking' | 'answer'): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    trace.phaseEnd(phase)
  } catch (e) {
    console.warn('[TraceHelper] endPhase failed:', e)
  }
}


/**
 * 标准化外部 toolCallId，添加前缀
 */
function normalizeToolCallId(externalId: string): string {
  // 如果已经有 tool_ 前缀，直接返回
  if (externalId.startsWith('tool_')) return externalId
  return `tool_${externalId}`
}

/**
 * 工具调用开始（使用已有的 toolCallId）
 * @param toolCallId - 工具调用 ID（后端传入）
 * @param name - 工具名称
 * @param args - 工具参数
 */
export function startToolWithId(
  toolCallId: string,
  name: string,
  args?: Record<string, unknown>
): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    // 标准化 ID 格式
    const normalizedId = normalizeToolCallId(toolCallId)
    trace.toolStart(name, args, normalizedId)

    // 统计工具使用次数
    const session = monitor.getSession()
    if (session) {
      session.incrementToolUsage(name)
    }
  } catch (e) {
    console.warn('[TraceHelper] startToolWithId failed:', e)
  }
}

/**
 * 工具调用结束
 * @param name - 工具名称
 * @param result - 工具结果
 */
export function endTool(
  name: string,
  result: {
    toolCallId?: string
    success: boolean
    imageUrl?: string
    width?: number
    height?: number
    resultCount?: number
    sources?: Array<{ title: string; url: string; snippet?: string }>
    error?: string
  }
): void {
  try {
    const monitor = getMonitor()
    if (!monitor) return

    const trace = monitor.getCurrentTrace()
    if (!trace) return

    // 标准化 ID 格式
    const normalizedResult = {
      ...result,
      toolCallId: result.toolCallId ? normalizeToolCallId(result.toolCallId) : undefined,
    }

    trace.toolEnd(name, normalizedResult as ToolResult)
  } catch (e) {
    console.warn('[TraceHelper] endTool failed:', e)
  }
}
