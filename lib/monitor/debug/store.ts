/**
 * 调试面板状态管理
 */

import { create } from 'zustand'
import type {
  MonitorEvent,
  TraceData,
  HttpRequest,
  SessionData,
  VitalsData,
  TabType,
} from './types'

interface DebugStore {
  // ========== 状态 ==========
  events: MonitorEvent[]
  filter: string[]
  isExpanded: boolean
  activeTab: TabType
  position: { x: number; y: number }
  selectedEventId: string | null

  // Trace 状态
  currentTrace: TraceData | null
  traceHistory: TraceData[]

  // Session 状态
  session: SessionData | null

  // Performance 状态
  vitals: VitalsData

  // Network 状态
  requests: HttpRequest[]

  // Queue 状态
  pendingCount: number
  offlineCount: number

  // Replay 状态
  replayEvents: unknown[]

  // ========== 操作 ==========
  addEvent: (event: MonitorEvent) => void
  setEvents: (events: MonitorEvent[]) => void
  setFilter: (types: string[]) => void
  clearEvents: () => void
  setExpanded: (expanded: boolean) => void
  setActiveTab: (tab: TabType) => void
  setPosition: (pos: { x: number; y: number }) => void
  setSelectedEventId: (id: string | null) => void

  // Trace 操作
  updateTrace: (trace: TraceData | null) => void
  addTraceToHistory: (trace: TraceData) => void

  // Session 操作
  updateSession: (session: SessionData | null) => void

  // Vitals 操作
  updateVital: (name: keyof VitalsData, value: number) => void

  // Network 操作
  addRequest: (request: HttpRequest) => void

  // Queue 操作
  updateQueueCounts: (pending: number, offline: number) => void

  // Replay 操作
  setReplayEvents: (events: unknown[]) => void
}

/** localStorage key */
const POSITION_STORAGE_KEY = 'sky-monitor-debug-panel-position'

/** 从 localStorage 读取位置 */
function loadPosition(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(POSITION_STORAGE_KEY)
    if (stored) {
      const pos = JSON.parse(stored)
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos
      }
    }
  } catch {
    // 静默失败
  }
  return null
}

/** 保存位置到 localStorage */
function savePosition(pos: { x: number; y: number }): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos))
  } catch {
    // 静默失败
  }
}

/** 约束位置在视口内 */
function constrainPosition(pos: { x: number; y: number }, panelWidth = 420, panelHeight = 520): { x: number; y: number } {
  if (typeof window === 'undefined') return pos
  const maxX = Math.max(0, window.innerWidth - panelWidth)
  const maxY = Math.max(0, window.innerHeight - panelHeight)
  return {
    x: Math.max(0, Math.min(maxX, pos.x)),
    y: Math.max(0, Math.min(maxY, pos.y)),
  }
}

/** 获取默认位置 */
function getDefaultPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  return {
    x: window.innerWidth - 420 - 16,
    y: window.innerHeight - 520 - 16,
  }
}

/** 最大事件数 */
const MAX_EVENTS = 500
/** 最大请求数 */
const MAX_REQUESTS = 100
/** 最大 Trace 历史数 */
const MAX_TRACE_HISTORY = 20

export const useDebugStore = create<DebugStore>((set) => ({
  // ========== 初始状态 ==========
  events: [],
  filter: [],
  isExpanded: false,
  activeTab: 'events',
  position: loadPosition() ?? getDefaultPosition(),
  selectedEventId: null,

  currentTrace: null,
  traceHistory: [],

  session: null,

  vitals: {},

  requests: [],

  pendingCount: 0,
  offlineCount: 0,

  replayEvents: [],

  // ========== 操作实现 ==========
  addEvent: (event) =>
    set((state) => {
      // 去重：如果已存在相同 id 的事件，跳过
      if (state.events.some((e) => e.id === event.id)) {
        return state
      }
      const newEvents = [event, ...state.events].slice(0, MAX_EVENTS)
      return { events: newEvents }
    }),

  setEvents: (events) =>
    set({ events: events.slice(0, MAX_EVENTS) }),

  setFilter: (types) => set({ filter: types }),

  clearEvents: () => set({ events: [], selectedEventId: null }),

  setExpanded: (expanded) => set({ isExpanded: expanded }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPosition: (pos) => {
    const constrained = constrainPosition(pos)
    savePosition(constrained)
    set({ position: constrained })
  },

  setSelectedEventId: (id) => set({ selectedEventId: id }),

  updateTrace: (trace) => set({ currentTrace: trace }),

  addTraceToHistory: (trace) =>
    set((state) => {
      const newHistory = [trace, ...state.traceHistory].slice(0, MAX_TRACE_HISTORY)
      return { traceHistory: newHistory }
    }),

  updateSession: (session) => set({ session }),

  updateVital: (name, value) =>
    set((state) => ({
      vitals: { ...state.vitals, [name]: value },
    })),

  addRequest: (request) =>
    set((state) => {
      // 去重：如果已存在相同 id 的请求，跳过
      if (state.requests.some((r) => r.id === request.id)) {
        return state
      }
      const newRequests = [request, ...state.requests].slice(0, MAX_REQUESTS)
      return { requests: newRequests }
    }),

  updateQueueCounts: (pending, offline) =>
    set({ pendingCount: pending, offlineCount: offline }),

  setReplayEvents: (events) => set({ replayEvents: events }),
}))

// ========== 选择器 ==========

/** 获取过滤后的事件 */
export function getFilteredEvents(events: MonitorEvent[], filter: string[]): MonitorEvent[] {
  if (filter.length === 0) return events
  return events.filter((e) => filter.includes(e.type))
}

/** 获取事件类型统计 */
export function getEventStats(events: MonitorEvent[]): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const event of events) {
    stats[event.type] = (stats[event.type] ?? 0) + 1
  }
  return stats
}

/** 获取所有事件类型 */
export function getEventTypes(events: MonitorEvent[]): string[] {
  return [...new Set(events.map((e) => e.type))]
}
