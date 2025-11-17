'use client'

/**
 * 消息操作按钮组件
 *
 * 提供消息级别的操作按钮，包括：
 * - 复制消息内容
 * - 朗读消息（TTS）
 * - 重试错误消息
 */

import * as React from 'react'
import { Copy, Volume2, RotateCw, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VOICE_OPTIONS } from '@/features/voice/constants/voices'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/features/voice/hooks/use-audio-player'
import { useToast } from '@/lib/hooks/use-toast'

interface MessageActionsProps {
  /** 消息内容 */
  content: string
  /** 消息 ID */
  messageId: string
  /** 消息角色 */
  role: 'user' | 'assistant'
  /** 是否有错误 */
  hasError?: boolean
  /** 复制回调 */
  onCopy?: () => void
  /** 重试回调 */
  onRetry?: () => void
  /** 额外的 CSS 类名 */
  className?: string
}

export function MessageActions({
  content,
  role,
  onCopy,
  onRetry,
  className,
}: MessageActionsProps) {
  const { playText, isGenerating, selectedVoice, setSelectedVoice } = useAudioPlayer()
  const { toast } = useToast()
  const copyingRef = React.useRef(false)

  const currentVoice = VOICE_OPTIONS.find(v => v.id === selectedVoice) || VOICE_OPTIONS[0]

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

        {/* 朗读按钮组（朗读 + 语音选择） */}
        {content && (
          <div className="flex items-center gap-0.5">
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

            {/* 语音选择 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {currentVoice.label}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-48 bg-white dark:bg-gray-900"
                align="start"
              >
                {/* 女声 */}
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                  女声
                </DropdownMenuLabel>
                {VOICE_OPTIONS.filter(v => v.gender === 'female').map((voice) => (
                  <DropdownMenuItem
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={cn(
                      'flex items-center justify-between cursor-pointer',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      voice.id === selectedVoice && 'bg-gray-100 dark:bg-gray-800'
                    )}
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {voice.label}
                    </span>
                    {voice.id === selectedVoice && <Check className="h-4 w-4 text-green-600" />}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                {/* 男声 */}
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                  男声
                </DropdownMenuLabel>
                {VOICE_OPTIONS.filter(v => v.gender === 'male').map((voice) => (
                  <DropdownMenuItem
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={cn(
                      'flex items-center justify-between cursor-pointer',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      voice.id === selectedVoice && 'bg-gray-100 dark:bg-gray-800'
                    )}
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {voice.label}
                    </span>
                    {voice.id === selectedVoice && <Check className="h-4 w-4 text-green-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* 重试按钮 - 所有 assistant 消息都可以重试 */}
        {role === 'assistant' && onRetry && (
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

      </div>
    </TooltipProvider>
  )
}

