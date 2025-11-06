'use client'

/**
 * 消息操作按钮组件
 * 
 * 提供消息级别的操作按钮，包括：
 * - 复制消息内容
 * - 朗读消息（TTS）
 * - 继续生成（断点续传）
 * - 重试错误消息
 */

import * as React from 'react'
import { Copy, Volume2, RotateCw, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/lib/hooks/use-audio-player'
import { useToast } from '@/hooks/use-toast'

interface MessageActionsProps {
  /** 消息内容 */
  content: string
  /** 消息 ID */
  messageId: string
  /** 会话 ID（用于断点续传） */
  sessionId?: string
  /** 是否有错误 */
  hasError?: boolean
  /** 是否可以继续生成 */
  canResume?: boolean
  /** 复制回调 */
  onCopy?: () => void
  /** 重试回调 */
  onRetry?: () => void
  /** 继续生成回调 */
  onResume?: () => void
  /** 额外的 CSS 类名 */
  className?: string
}

export function MessageActions({
  content,
  sessionId,
  hasError,
  canResume,
  onCopy,
  onRetry,
  onResume,
  className,
}: MessageActionsProps) {
  const { playText, isGenerating } = useAudioPlayer()
  const { toast } = useToast()
  const copyingRef = React.useRef(false)

  // 复制到剪贴板（防抖）
  const handleCopy = React.useCallback(async () => {
    if (copyingRef.current) return
    copyingRef.current = true

    try {
      await navigator.clipboard.writeText(content)
      onCopy?.()
      toast({
        title: '已复制到剪贴板',
        variant: 'success',
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: '复制失败',
        description: '请手动选择并复制',
        variant: 'destructive',
      })
    } finally {
      setTimeout(() => {
        copyingRef.current = false
      }, 500)
    }
  }, [content, onCopy, toast])

  // 播放音频（防止重复点击）
  const handlePlay = React.useCallback(async () => {
    if (isGenerating) return

    try {
      await playText(content)
    } catch (error) {
      console.error('Failed to play audio:', error)
      toast({
        title: '播放失败',
        description: '请重试',
        variant: 'destructive',
      })
    }
  }, [content, playText, isGenerating, toast])

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {/* 复制按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
            <p>复制</p>
          </TooltipContent>
        </Tooltip>

        {/* 朗读按钮 */}
        {content && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlay}
                disabled={isGenerating}
                className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <p>朗读</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 重试按钮 */}
        {hasError && onRetry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRetry}
                className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <p>重试</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 继续生成按钮 */}
        {canResume && sessionId && onResume && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResume}
                className="h-7 px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">继续</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <p>继续生成</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

