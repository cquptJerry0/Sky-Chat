/**
 * 调试面板主组件
 *
 * 可拖拽、可缩放的悬浮窗，用于实时查看 SDK 采集的数据
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useDebugStore } from './store'
import {
  EventsTab,
  TraceTab,
  PerformanceTab,
  NetworkTab,
  SessionTab,
  QueueTab,
  TestTriggers,
  ReplayTab,
} from './components'
import type { TabType } from './types'
import { Minus } from 'lucide-react'

// ShadcnUI 组件
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// 面板尺寸常量
const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 520
const MIN_WIDTH = 320
const MIN_HEIGHT = 400
const MAX_WIDTH = 800
const MAX_HEIGHT = 900

// Tab 配置
const TABS: { id: TabType; label: string }[] = [
  { id: 'events', label: '事件' },
  { id: 'trace', label: 'Trace' },
  { id: 'replay', label: '回放' },
  { id: 'performance', label: '性能' },
  { id: 'network', label: '网络' },
  { id: 'session', label: '会话' },
  { id: 'queue', label: '队列' },
]

interface DebugPanelProps {
  /** 连接状态 */
  connectionStatus?: 'connecting' | 'connected' | 'error'
  /** 连接错误信息 */
  connectionError?: string | null
}

export function DebugPanel({ connectionStatus = 'connected', connectionError }: DebugPanelProps) {
  const {
    isExpanded,
    setExpanded,
    activeTab,
    setActiveTab,
    position,
    setPosition,
    events,
  } = useDebugStore()

  const panelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // 拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [position])

  // 缩放开始
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    }
  }, [size])

  // 拖拽移动
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => setIsDragging(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setPosition])

  // 缩放移动
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.current.x
      const deltaY = e.clientY - resizeStart.current.y
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStart.current.width + deltaX))
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStart.current.height + deltaY))
      setSize({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => setIsResizing(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // 窗口 resize 时重新约束位置
  useEffect(() => {
    const handleResize = () => setPosition(position)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [position, setPosition])

  // 连接状态 Badge
  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">已连接</Badge>
      case 'connecting':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 animate-pulse">连接中</Badge>
      case 'error':
        return <Badge variant="destructive" title={connectionError ?? undefined}>连接失败</Badge>
    }
  }

  // 折叠状态：显示悬浮按钮
  if (!isExpanded) {
    const statusColor = connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-red-500'
    return (
      <Button
        onClick={() => setExpanded(true)}
        variant="secondary"
        className="fixed z-[9999] gap-2 shadow-lg"
        style={{ right: 16, bottom: 16 }}
        title={connectionError ?? undefined}
      >
        <span className={`w-2 h-2 ${statusColor} rounded-full`} />
        <span>Monitor</span>
        <Badge variant="secondary" className="ml-1">{events.length}</Badge>
      </Button>
    )
  }

  // 展开状态：显示完整面板
  return (
    <Card
      ref={panelRef}
      className="fixed z-[9999] bg-background/95 backdrop-blur-sm border-border shadow-2xl flex flex-col overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* 标题栏 - 可拖拽 */}
      <CardHeader
        className="flex flex-row items-center justify-between px-4 py-2 border-b cursor-grab select-none space-y-0"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-sm font-medium">Sky Monitor</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <TestTriggers />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(false)}
            title="最小化"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Tab 导航和内容 */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 h-auto p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <TabsContent value="events" className="h-full m-0">
            <EventsTab />
          </TabsContent>
          <TabsContent value="trace" className="h-full m-0">
            <TraceTab />
          </TabsContent>
          <TabsContent value="replay" className="h-full m-0">
            <ReplayTab />
          </TabsContent>
          <TabsContent value="performance" className="h-full m-0">
            <PerformanceTab />
          </TabsContent>
          <TabsContent value="network" className="h-full m-0">
            <NetworkTab />
          </TabsContent>
          <TabsContent value="session" className="h-full m-0">
            <SessionTab />
          </TabsContent>
          <TabsContent value="queue" className="h-full m-0">
            <QueueTab />
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* 右下角缩放手柄 */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize no-drag"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, hsl(var(--muted-foreground) / 0.3) 50%)',
        }}
      />
    </Card>
  )
}
