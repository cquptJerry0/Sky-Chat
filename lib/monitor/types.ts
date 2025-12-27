/**
 * Monitor 类型定义
 *
 * 扩展 Monitor 类型以包含插件注入的方法
 */

import type { Trace, Session, IMonitor } from '@jerry_aurora/sky-monitor-sdk'

/** TracePlugin 注入的方法 */
export interface TracePluginMethods {
  createTrace: (options: { aiMessageId: string; previousTraceId?: string }) => Trace
  setCurrentTrace: (trace: Trace | null) => void
  getCurrentTrace: () => Trace | null
}

/** SessionPlugin 注入的方法 */
export interface SessionPluginMethods {
  startSession: () => void
  endSession: () => void
  getSession: () => Session | null
}

/** 扩展后的 Monitor 类型 */
export type MonitorWithPlugins = IMonitor & TracePluginMethods & SessionPluginMethods
