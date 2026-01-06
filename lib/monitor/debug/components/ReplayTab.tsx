/**
 * Replay Tab - rrweb 录制回放
 *
 * 功能：
 * - 动态导入 rrweb-player
 * - 播放控制（播放/暂停/跳转）
 * - 错误回溯状态显示
 * - 空状态提示
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useDebugStore } from '../store'
import { Clapperboard, Play, Pause, RotateCcw, XCircle, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

// ShadcnUI 组件
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// rrweb-player 类型
type RRWebPlayer = {
  play: () => void
  pause: () => void
  goto: (timeOffset: number) => void
  destroy: () => void
}

export function ReplayTab() {
  const { replayEvents, errorReplayEvents, pendingErrorReplays } = useDebugStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<RRWebPlayer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 初始化播放器
  const initPlayer = useCallback(async () => {
    if (!containerRef.current || replayEvents.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      // 动态导入 rrweb-player
      const { default: rrwebPlayer } = await import('rrweb-player')

      // 销毁旧播放器
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      // 清空容器
      containerRef.current.innerHTML = ''

      // 创建新播放器
      playerRef.current = new rrwebPlayer({
        target: containerRef.current,
        props: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          events: replayEvents as any,
          width: 380,
          height: 280,
          autoPlay: false,
          showController: true,
          speedOption: [1, 2, 4, 8],
        },
      }) as unknown as RRWebPlayer

      setIsPlaying(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载播放器失败')
    } finally {
      setIsLoading(false)
    }
  }, [replayEvents])

  // 事件变化时重新初始化
  useEffect(() => {
    if (replayEvents.length > 0) {
      initPlayer()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [replayEvents, initPlayer])

  // 播放/暂停
  const handlePlayPause = () => {
    if (!playerRef.current) return

    if (isPlaying) {
      playerRef.current.pause()
    } else {
      playerRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // 重新开始
  const handleRestart = () => {
    if (!playerRef.current) return
    playerRef.current.goto(0)
    playerRef.current.play()
    setIsPlaying(true)
  }

  // 空状态
  if (replayEvents.length === 0) {
    return (
      <div className="flex flex-col h-full p-4">
        {/* 错误回溯状态卡片 */}
        {errorReplayEvents.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                错误回溯状态
              </div>
              <div className="space-y-1">
                {pendingErrorReplays > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <Clock className="w-3 h-3 animate-pulse" />
                    <span>{pendingErrorReplays} 个错误回溯等待上报中...</span>
                  </div>
                )}
                {errorReplayEvents.slice(0, 3).map((event, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {event.type === 'error_recorded' && <AlertCircle className="w-3 h-3 text-red-500" />}
                    {event.type === 'replay_scheduled' && <Clock className="w-3 h-3 text-amber-500" />}
                    {event.type === 'replay_uploaded' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    <span className="truncate flex-1">{event.errorMessage}</span>
                    <span className="text-muted-foreground/50">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 空状态提示 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Clapperboard className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <div className="text-sm text-muted-foreground mb-2">暂无录制数据</div>
          <div className="text-xs text-muted-foreground/60 space-y-1">
            <p>录制数据会在页面操作时自动采集</p>
            <p className="text-amber-500/80">
              提示: 错误回溯数据会在错误发生后 65 秒上报
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
        <div className="text-sm text-muted-foreground">加载播放器...</div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <XCircle className="w-12 h-12 text-destructive/50 mb-4" />
        <div className="text-sm text-destructive mb-2">加载失败</div>
        <div className="text-xs text-muted-foreground mb-4">{error}</div>
        <Button variant="outline" size="sm" onClick={initPlayer}>
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 错误回溯状态提示 */}
      {pendingErrorReplays > 0 && (
        <div className="mx-2 mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>{pendingErrorReplays} 个错误回溯等待上报中...</span>
          </div>
        </div>
      )}

      {/* 播放器容器 */}
      <div className="flex-1 overflow-hidden p-2">
        <div
          ref={containerRef}
          className="w-full h-full bg-muted rounded-lg overflow-hidden"
        />
      </div>

      {/* 控制栏 */}
      <Card className="m-2 mt-0">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                className="h-7"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="h-7"
                title="重新开始"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {replayEvents.length} 个事件
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
