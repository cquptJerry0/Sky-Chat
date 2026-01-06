/**
 * 调试面板类型定义
 */

import type { MonitorEvent } from '@jerry_aurora/sky-monitor-sdk'

/** Trace 数据 */
export interface TraceData {
  traceId: string
  aiMessageId: string
  state: 'active' | 'completed' | 'error' | 'aborted'
  startTime: number
  endTime?: number
  phases: PhaseData[]
  tools: ToolData[]
  metrics: {
    ttfb?: number
    chunkCount?: number
    duration?: number
  }
}

/** 阶段数据 */
export interface PhaseData {
  name: string
  startTime: number
  endTime?: number
}

/** 工具调用数据 */
export interface ToolData {
  toolCallId: string
  name: string
  startTime: number
  endTime?: number
  success?: boolean
  args?: Record<string, unknown>
}

/** HTTP 请求数据 */
export interface HttpRequest {
  id: string
  url: string
  method: string
  status: number
  duration: number
  timestamp: number
  error?: string
}

/** Session 数据 */
export interface SessionData {
  id: string
  startTime: number
  traceCount: number
  toolUsage: Record<string, number>
  isVisible: boolean
}

/** Web Vitals 数据 */
export interface VitalsData {
  FCP?: number
  LCP?: number
  CLS?: number
  INP?: number
}

/** 事件过滤器 */
export interface EventFilter {
  types: string[]
  search: string
}

/** Tab 类型 */
export type TabType = 'events' | 'trace' | 'replay' | 'performance' | 'network' | 'session' | 'queue'

/** 事件类型颜色映射 */
export const EVENT_COLORS: Record<string, string> = {
  // SSE/Trace 相关 - 蓝色系
  sse_start: '#3b82f6',
  sse_complete: '#3b82f6',
  sse_error: '#ef4444',
  sse_abort: '#f97316',
  sse_first_chunk: '#60a5fa',
  sse_stall: '#f59e0b',
  sse_resume: '#22c55e',
  user_retry: '#8b5cf6',

  // Phase 相关 - 紫色系
  phase_start: '#8b5cf6',
  phase_end: '#a78bfa',

  // Tool 相关 - 青色系
  tool_start: '#06b6d4',
  tool_end: '#22d3ee',

  // Image 相关 - 粉色系
  image_load_start: '#ec4899',
  image_load_complete: '#f472b6',
  image_load_error: '#ef4444',

  // 旧 Trace 事件（兼容）
  trace_start: '#3b82f6',
  trace_end: '#3b82f6',
  trace_phase: '#60a5fa',
  trace_tool: '#93c5fd',
  trace_chunk: '#bfdbfe',

  // Session 相关 - 绿色系
  session_start: '#22c55e',
  session_end: '#22c55e',
  session_visibility: '#4ade80',

  // Error 相关 - 红色系
  js_error: '#ef4444',
  promise_error: '#f87171',
  resource_error: '#fca5a5',
  console_error: '#fecaca',

  // Performance - 紫色系
  web_vital: '#a855f7',

  // Network - 橙色系
  http_request: '#f97316',

  // Replay - 青色系
  replay_events: '#06b6d4',
  error_replay: '#0891b2',
}

/** 获取事件颜色 */
export function getEventColor(type: string): string {
  return EVENT_COLORS[type] ?? '#6b7280'
}

/** Web Vitals 阈值 */
export const VITALS_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
}

/** 获取 Vital 颜色 */
export function getVitalColor(name: keyof typeof VITALS_THRESHOLDS, value: number): string {
  const threshold = VITALS_THRESHOLDS[name]
  if (value < threshold.good) return '#22c55e' // 绿色
  if (value < threshold.poor) return '#eab308' // 黄色
  return '#ef4444' // 红色
}

/** 重新导出 MonitorEvent */
export type { MonitorEvent }
