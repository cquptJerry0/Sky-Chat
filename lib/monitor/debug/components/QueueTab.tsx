/**
 * 上报队列 Tab
 */

'use client'

import { useState, useEffect } from 'react'
import { useDebugStore } from '../store'

// ShadcnUI 组件
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/** DebugPlugin 队列 API 类型 */
interface DebugPluginWithQueue {
  getQueueStatus: () => Promise<{ pending: number; offline: number }>
  subscribeQueue: (fn: (status: { pending: number; offline: number }) => void) => () => void
  flushQueue: () => Promise<boolean>
  clearQueue: () => void
}

export function QueueTab() {
  const { pendingCount, offlineCount, updateQueueCounts } = useDebugStore()
  const [isSending, setIsSending] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null)

  // 订阅队列状态
  useEffect(() => {
    const debugPlugin = (window as unknown as Record<string, DebugPluginWithQueue>).__SKY_MONITOR_DEBUG__
    if (!debugPlugin?.subscribeQueue) return

    const unsubscribe = debugPlugin.subscribeQueue((status) => {
      updateQueueCounts(status.pending, status.offline)
    })

    return unsubscribe
  }, [updateQueueCounts])

  const handleFlush = async () => {
    setIsSending(true)
    setLastResult(null)

    try {
      const debugPlugin = (window as unknown as Record<string, DebugPluginWithQueue>).__SKY_MONITOR_DEBUG__
      if (debugPlugin?.flushQueue) {
        const success = await debugPlugin.flushQueue()
        setLastResult(success ? 'success' : 'error')
      }
    } catch {
      setLastResult('error')
    } finally {
      setIsSending(false)
    }
  }

  const handleClear = () => {
    setIsClearing(true)
    try {
      const debugPlugin = (window as unknown as Record<string, DebugPluginWithQueue>).__SKY_MONITOR_DEBUG__
      if (debugPlugin?.clearQueue) {
        debugPlugin.clearQueue()
        setLastResult('success')
      }
    } catch {
      setLastResult('error')
    } finally {
      setIsClearing(false)
    }
  }

  const totalCount = pendingCount + offlineCount

  return (
    <div className="p-3 space-y-4">
      {/* 队列状态 */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">队列状态</div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">待发送</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-yellow-500">{offlineCount}</div>
              <div className="text-xs text-muted-foreground">离线队列</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={handleFlush}
            disabled={isSending || totalCount === 0}
            className="flex-1"
          >
            {isSending ? '发送中...' : '立即发送'}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isClearing || totalCount === 0}
            className="flex-1"
          >
            {isClearing ? '清空中...' : '清空队列'}
          </Button>
        </div>

        {lastResult && (
          <div className={`text-xs text-center ${
            lastResult === 'success' ? 'text-green-500' : 'text-red-500'
          }`}>
            {lastResult === 'success' ? '操作成功' : '操作失败'}
          </div>
        )}
      </div>

      {/* 说明 */}
      <Card className="bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
          <p>• 待发送：内存中等待批量发送的事件</p>
          <p>• 离线队列：IndexedDB 中存储的离线事件</p>
          <p>• 立即发送：触发所有队列的发送</p>
          <p>• 清空队列：丢弃内存队列（不发送）</p>
        </CardContent>
      </Card>
    </div>
  )
}
