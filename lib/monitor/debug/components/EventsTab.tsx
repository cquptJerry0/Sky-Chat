/**
 * 事件列表 Tab
 */

'use client'

import { useState } from 'react'
import { useDebugStore, getFilteredEvents, getEventStats, getEventTypes } from '../store'
import { getEventColor } from '../types'

// ShadcnUI 组件
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'


export function EventsTab() {
  const { events, filter, setFilter, clearEvents, selectedEventId, setSelectedEventId } = useDebugStore()
  const [searchText, setSearchText] = useState('')

  const stats = getEventStats(events)
  const types = getEventTypes(events)
  const filteredEvents = getFilteredEvents(events, filter)

  // 搜索过滤
  const displayEvents = searchText
    ? filteredEvents.filter((e) =>
        JSON.stringify(e).toLowerCase().includes(searchText.toLowerCase())
      )
    : filteredEvents

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Input
          type="text"
          placeholder="搜索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 h-7 text-xs"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={clearEvents}
          className="h-7 text-xs text-muted-foreground"
        >
          清空
        </Button>
      </div>

      {/* 类型过滤器 */}
      <div className="flex flex-wrap gap-1 p-2 border-b">
        {types.map((type) => {
          const isActive = filter.length === 0 || filter.includes(type)
          const color = getEventColor(type)
          return (
            <Badge
              key={type}
              variant="outline"
              className={`cursor-pointer transition-all text-xs ${
                isActive
                  ? 'opacity-100 ring-2 ring-offset-1 ring-offset-background'
                  : 'opacity-40 hover:opacity-60'
              }`}
              style={{
                backgroundColor: color + (isActive ? '30' : '10'),
                borderColor: color + (isActive ? '80' : '30'),
                color: color,
                // @ts-expect-error CSS custom property
                '--tw-ring-color': color + '50',
              }}
              onClick={() => {
                if (filter.includes(type)) {
                  setFilter(filter.filter((t) => t !== type))
                } else {
                  setFilter([...filter, type])
                }
              }}
            >
              {type} ({stats[type]})
            </Badge>
          )
        })}
      </div>

      {/* 事件列表 */}
      <ScrollArea className="flex-1">
        {displayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
            暂无事件
          </div>
        ) : (
          displayEvents.map((event) => {
            const summary = getEventSummary(event)
            return (
              <div
                key={event.id}
                onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                className={`border-b cursor-pointer hover:bg-muted/50 ${
                  selectedEventId === event.id ? 'bg-muted' : ''
                }`}
              >
                {/* 事件摘要 */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getEventColor(event.type) }}
                  />
                  <span className="text-xs font-medium" style={{ color: getEventColor(event.type) }}>
                    {event.type}
                  </span>
                  <span
                    className="text-xs text-muted-foreground flex-1 truncate"
                    title={summary}
                  >
                    {summary}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {formatTime(event.timestamp)}
                  </span>
                </div>

                {/* 展开详情 */}
                {selectedEventId === event.id && (
                  <div className="px-3 pb-2">
                    <pre className="p-2 text-xs bg-muted rounded overflow-x-auto max-h-48">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })
        )}
      </ScrollArea>
    </div>
  )
}

/** 获取事件摘要 */
function getEventSummary(event: { type: string; data: Record<string, unknown> }): string {
  const { type, data } = event

  switch (type) {
    case 'http_request':
      return `${data.method} ${data.url} → ${data.status}`
    case 'js_error':
    case 'promise_error':
      return String(data.message ?? '')
    case 'web_vital':
      return `${data.name}: ${data.value}`
    // SSE 事件
    case 'sse_start':
      return `开始 ${data.aiMessageId ?? ''}`
    case 'sse_complete':
      return `完成 ttlb=${data.ttlb}ms`
    case 'sse_error':
      return `错误: ${data.error ?? ''}`
    case 'sse_abort':
      return `中止: ${data.reason ?? ''}`
    case 'sse_first_chunk':
      return `首字节 ttfb=${data.ttfb}ms`
    case 'sse_stall':
      return `卡顿 ${data.stallDuration}ms`
    case 'sse_resume':
      return `恢复 卡顿${data.stallDuration}ms`
    case 'phase_start':
      return `${data.phase} 开始`
    case 'phase_end':
      return `${data.phase} 结束 ${data.duration}ms`
    case 'tool_start':
      return `${data.name} 开始`
    case 'tool_end':
      return `${data.name} ${data.success ? '成功' : '失败'} ${data.duration}ms`
    // 旧事件类型（兼容）
    case 'trace_start':
      return `开始 ${data.aiMessageId ?? ''}`
    case 'trace_end':
      return `结束 ${data.state ?? ''}`
    case 'trace_phase':
      return `${data.phase} ${data.action ?? ''}`
    case 'trace_tool':
      return `${data.name} ${data.action ?? ''}`
    default:
      return ''
  }
}

/** 格式化时间 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
