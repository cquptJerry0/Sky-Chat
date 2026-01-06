/**
 * 会话信息 Tab
 */

'use client'

import { useDebugStore } from '../store'

// ShadcnUI 组件
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function SessionTab() {
  const { session } = useDebugStore()

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        会话未启动
      </div>
    )
  }

  const duration = Date.now() - session.startTime
  const toolEntries = Object.entries(session.toolUsage)

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* 基本信息 */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">会话信息</div>
          <Card className="bg-muted/50">
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Session ID</span>
                <span className="font-mono">{session.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">开始时间</span>
                <span>{formatTime(session.startTime)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">持续时长</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">页面可见</span>
                <span className={session.isVisible ? 'text-green-500' : 'text-yellow-500'}>
                  {session.isVisible ? '是' : '否'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 统计信息 */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">统计</div>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-blue-500">{session.traceCount}</div>
                <div className="text-xs text-muted-foreground">对话次数</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-green-500">{toolEntries.length}</div>
                <div className="text-xs text-muted-foreground">工具种类</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 工具使用 */}
        {toolEntries.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">工具使用</div>
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                {toolEntries.map(([name, count]) => (
                  <div key={name} className="flex justify-between text-xs">
                    <span>{name}</span>
                    <span className="text-muted-foreground">{count} 次</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

/** 格式化时间 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** 格式化持续时长 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
