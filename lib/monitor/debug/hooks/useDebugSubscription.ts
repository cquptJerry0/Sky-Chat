/**
 * useDebugSubscription - 调试面板事件订阅 Hook
 *
 * 解决 DebugPlugin 初始化时机问题：
 * - 轮询等待 window.__SKY_MONITOR_DEBUG__ 可用
 * - 加载已缓存事件
 * - 订阅新事件
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useDebugStore } from '../store'
import type { MonitorEvent } from '@jerry_aurora/sky-monitor-sdk'

/** DebugPlugin 接口 */
interface IDebugPlugin {
  subscribe: (fn: (event: MonitorEvent) => void) => () => void
  getEvents: () => MonitorEvent[]
  getEventsByType: (type: string) => MonitorEvent[]
  getStats: () => Record<string, number>
  clearEvents: () => void
}

interface UseDebugSubscriptionOptions {
  /** 轮询间隔（ms），默认 100 */
  pollInterval?: number
  /** 最大等待时间（ms），默认 5000 */
  maxWaitTime?: number
}

interface UseDebugSubscriptionResult {
  /** 是否已连接到 DebugPlugin */
  isConnected: boolean
  /** 连接状态 */
  status: 'connecting' | 'connected' | 'error'
  /** 连接错误信息 */
  error: string | null
  /** 手动重连 */
  reconnect: () => void
}

/**
 * 获取 DebugPlugin 实例
 */
function getDebugPlugin(): IDebugPlugin | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as Record<string, IDebugPlugin>).__SKY_MONITOR_DEBUG__ ?? null
}

/**
 * 调试面板事件订阅 Hook
 */
export function useDebugSubscription(
  options: UseDebugSubscriptionOptions = {}
): UseDebugSubscriptionResult {
  const { pollInterval = 100, maxWaitTime = 5000 } = options

  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)

  const { addEvent, updateVital, addRequest, updateSession, setEvents, updateTrace, addTraceToHistory } = useDebugStore()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)
  const currentTraceRef = useRef<{
    traceId: string
    aiMessageId: string
    startTime: number
    state: 'active' | 'completed' | 'error' | 'aborted'
    phases: Array<{ name: string; startTime: number; endTime?: number }>
    tools: Array<{ toolCallId: string; name: string; startTime: number; endTime?: number; success?: boolean }>
    metrics: { ttfb?: number; chunkCount?: number; duration?: number }
  } | null>(null)

  /**
   * 处理事件
   */
  const handleEvent = useCallback(
    (event: MonitorEvent) => {
      addEvent(event)

      // 根据事件类型更新其他状态
      if (event.type === 'web_vital') {
        const name = event.data.name as 'FCP' | 'LCP' | 'CLS' | 'INP'
        const value = event.data.value as number
        updateVital(name, value)
      }

      if (event.type === 'http_request') {
        addRequest({
          id: event.id,
          url: String(event.data.url ?? ''),
          method: String(event.data.method ?? 'GET'),
          status: Number(event.data.status ?? 0),
          duration: Number(event.data.duration ?? 0),
          timestamp: event.timestamp,
          error: event.data.error ? String(event.data.error) : undefined,
        })
      }

      // ========== SSE 事件处理（SDK 实际发出的事件类型）==========
      
      // sse_start: 创建新 trace
      if (event.type === 'sse_start') {
        currentTraceRef.current = {
          traceId: String(event.data.traceId ?? event.id),
          aiMessageId: String(event.data.aiMessageId ?? ''),
          startTime: event.timestamp,
          state: 'active',
          phases: [],
          tools: [],
          metrics: {},
        }
        updateTrace(currentTraceRef.current)
        
        // 更新 session traceCount
        const currentSession = useDebugStore.getState().session
        if (currentSession) {
          updateSession({
            ...currentSession,
            traceCount: currentSession.traceCount + 1,
          })
        }
      }

      // sse_complete/sse_error/sse_abort: 结束 trace
      if (
        (event.type === 'sse_complete' || event.type === 'sse_error' || event.type === 'sse_abort') &&
        currentTraceRef.current
      ) {
        const endState =
          event.type === 'sse_complete' ? 'completed' : event.type === 'sse_error' ? 'error' : 'aborted'
        currentTraceRef.current.state = endState
        currentTraceRef.current.metrics.duration = Number(event.data.ttlb ?? event.data.duration ?? 0)
        addTraceToHistory({ ...currentTraceRef.current })
        updateTrace(null)
        currentTraceRef.current = null
      }

      // sse_first_chunk: 更新 TTFB
      if (event.type === 'sse_first_chunk' && currentTraceRef.current) {
        currentTraceRef.current.metrics.ttfb = Number(event.data.ttfb ?? 0)
        updateTrace({ ...currentTraceRef.current })
      }

      // phase_start: 添加 phase
      if (event.type === 'phase_start' && currentTraceRef.current) {
        currentTraceRef.current.phases.push({
          name: String(event.data.phase ?? ''),
          startTime: event.timestamp,
        })
        updateTrace({ ...currentTraceRef.current })
      }

      // phase_end: 结束 phase
      if (event.type === 'phase_end' && currentTraceRef.current) {
        const phaseName = String(event.data.phase ?? '')
        const phase = currentTraceRef.current.phases.find((p) => p.name === phaseName && !p.endTime)
        if (phase) phase.endTime = event.timestamp
        updateTrace({ ...currentTraceRef.current })
      }

      // tool_start: 添加 tool
      if (event.type === 'tool_start' && currentTraceRef.current) {
        currentTraceRef.current.tools.push({
          toolCallId: String(event.data.toolCallId ?? ''),
          name: String(event.data.name ?? ''),
          startTime: event.timestamp,
        })
        updateTrace({ ...currentTraceRef.current })
      }

      // tool_end: 结束 tool，更新 session toolUsage
      if (event.type === 'tool_end' && currentTraceRef.current) {
        const toolCallId = String(event.data.toolCallId ?? '')
        const tool = currentTraceRef.current.tools.find((t) => t.toolCallId === toolCallId)
        if (tool) {
          tool.endTime = event.timestamp
          tool.success = event.data.success as boolean | undefined
        }
        updateTrace({ ...currentTraceRef.current })

        // 更新 session toolUsage
        const currentSession = useDebugStore.getState().session
        if (currentSession) {
          const toolName = String(event.data.name ?? '')
          const newToolUsage = { ...currentSession.toolUsage }
          newToolUsage[toolName] = (newToolUsage[toolName] ?? 0) + 1
          updateSession({
            ...currentSession,
            toolUsage: newToolUsage,
          })
        }
      }

      // ========== Session 事件处理 ==========
      
      if (event.type === 'session_start') {
        updateSession({
          id: String(event.data.sessionId ?? event.id),
          startTime: event.timestamp,
          traceCount: 0,
          toolUsage: {},
          isVisible: true,
        })
      }

      if (event.type === 'session_visibility') {
        const currentSession = useDebugStore.getState().session
        if (currentSession) {
          updateSession({
            ...currentSession,
            isVisible: Boolean(event.data.visible),
          })
        }
      }

      if (event.type === 'session_end') {
        const currentSession = useDebugStore.getState().session
        if (currentSession) {
          updateSession({
            ...currentSession,
            traceCount: Number(event.data.traceCount ?? currentSession.traceCount),
            toolUsage: (event.data.toolUsage as Record<string, number>) ?? currentSession.toolUsage,
          })
        }
      }

      // ========== Replay 事件处理 ==========
      
      if (event.type === 'replay_events' || event.type === 'error_replay') {
        const events = event.data.events as unknown[]
        if (events && events.length > 0) {
          useDebugStore.getState().setReplayEvents(events)
        }
      }
    },
    [addEvent, updateVital, addRequest, updateSession, updateTrace, addTraceToHistory]
  )

  /**
   * 连接到 DebugPlugin
   */
  const connect = useCallback(() => {
    const debugPlugin = getDebugPlugin()

    if (debugPlugin) {
      // 加载已缓存的事件
      const cachedEvents = debugPlugin.getEvents()
      if (cachedEvents.length > 0) {
        setEvents(cachedEvents)
        
        // 处理缓存事件中的 web_vital 和 http_request
        for (const event of cachedEvents) {
          if (event.type === 'web_vital') {
            const name = event.data.name as 'FCP' | 'LCP' | 'CLS' | 'INP'
            const value = event.data.value as number
            if (name && value !== undefined) {
              updateVital(name, value)
            }
          }
          if (event.type === 'http_request') {
            addRequest({
              id: event.id,
              url: String(event.data.url ?? ''),
              method: String(event.data.method ?? 'GET'),
              status: Number(event.data.status ?? 0),
              duration: Number(event.data.duration ?? 0),
              timestamp: event.timestamp,
              error: event.data.error ? String(event.data.error) : undefined,
            })
          }
          if (event.type === 'replay_events' || event.type === 'error_replay') {
            const events = event.data.events as unknown[]
            if (events && events.length > 0) {
              useDebugStore.getState().setReplayEvents(events)
            }
          }
        }
      }

      // 订阅新事件
      unsubscribeRef.current = debugPlugin.subscribe(handleEvent)

      setStatus('connected')
      setError(null)
      return true
    }

    return false
  }, [handleEvent, setEvents, updateVital, addRequest])

  /**
   * 轮询等待 DebugPlugin
   */
  const startPolling = useCallback(() => {
    startTimeRef.current = Date.now()
    setStatus('connecting')
    setError(null)

    const poll = () => {
      // 检查是否超时
      if (Date.now() - startTimeRef.current > maxWaitTime) {
        setStatus('error')
        setError('DebugPlugin 初始化超时，请检查 SDK 配置')
        return
      }

      // 尝试连接
      if (connect()) {
        return
      }

      // 继续轮询
      pollTimerRef.current = setTimeout(poll, pollInterval)
    }

    poll()
  }, [connect, maxWaitTime, pollInterval])

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    // 清理现有连接
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }

    // 重新开始轮询
    startPolling()
  }, [startPolling])

  // 组件挂载时开始轮询
  useEffect(() => {
    if (typeof window === 'undefined') return

    startPolling()

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [startPolling])

  return {
    isConnected: status === 'connected',
    status,
    error,
    reconnect,
  }
}
