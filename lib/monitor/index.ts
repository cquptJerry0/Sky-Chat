/**
 * Monitor 单例模块
 *
 * 提供全局唯一的 Monitor 实例，配置所有插件
 */

'use client'

import {
  Monitor,
  TracePlugin,
  SessionPlugin,
  TransportPlugin,
  DedupePlugin,
  ErrorPlugin,
  PerformancePlugin,
  FetchPlugin,
  OfflineQueuePlugin,
  BrowserStorage,
  BrowserTransport,
  DebugPlugin,
} from '@jerry_aurora/sky-monitor-sdk'
import type { MonitorWithPlugins } from './types'

let monitor: MonitorWithPlugins | null = null
let isInitializing = false

/**
 * 初始化 Monitor 实例
 */
function initMonitor(): MonitorWithPlugins {
  const isDev = process.env.NODE_ENV === 'development'
  const endpoint = '/api/monitor'

  // 创建 Monitor 实例
  const instance = new Monitor({
    appId: 'sky-chat-app',
    debug: isDev,
    storage: new BrowserStorage(),
  })

  // ========== 调试插件（仅开发环境）==========
  if (isDev) {
    instance.use(new DebugPlugin({ maxEvents: 500 }))
  }

  // ========== 核心插件 ==========
  instance.use(new TracePlugin())
  instance.use(new SessionPlugin())

  // ========== 自动采集插件 ==========
  instance.use(new ErrorPlugin())
  instance.use(new PerformancePlugin({
    realtime: isDev, // 开发环境实时上报 LCP/CLS/INP
  }))
  instance.use(new FetchPlugin({
    excludeUrls: [/\/api\/monitor/, /\/api\/chat/],
  }))

  // ========== 管道插件 ==========
  instance.use(new DedupePlugin({
    windowMs: 1000,
  }))

  // ========== 上报插件 ==========
  instance.use(new OfflineQueuePlugin())
  instance.use(new TransportPlugin({
    endpoint,
    transport: new BrowserTransport(endpoint),
    mode: 'batch',
    batchSize: 10,
    flushInterval: 5000,
    maxRetries: 3,
    maxBufferSize: 100,
    criticalTypes: ['sse_error', 'js_error', 'promise_error'],
  }))

  // 类型断言：插件会动态注入方法
  return instance as unknown as MonitorWithPlugins
}

/**
 * 获取 Monitor 单例（懒加载）
 */
export function getMonitor(): MonitorWithPlugins | null {
  // 服务端渲染时返回 null
  if (typeof window === 'undefined') return null

  // 防止重复初始化
  if (isInitializing) return null

  if (!monitor) {
    isInitializing = true
    try {
      monitor = initMonitor()
    } finally {
      isInitializing = false
    }
  }

  return monitor
}

/**
 * 检查 Monitor 是否已初始化
 */
export function isMonitorReady(): boolean {
  return monitor !== null
}
