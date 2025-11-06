'use client'

import * as React from 'react'
import { ArrowUp, Mic, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAudioRecorder } from '@/lib/hooks/use-audio-recorder'
import { ChatAPI } from '@/lib/services/chat-api'
import { useToast } from '@/hooks/use-toast'

type ChatInputProps = {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = React.useState('')
  const [isTranscribing, setIsTranscribing] = React.useState(false)
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder()
  const { toast } = useToast()

  // 防抖处理输入
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled && !isRecording && !isTranscribing) {
      onSend(input.trim())
      setInput('')
    }
  }

  // 处理录音（防抖）
  const handleVoiceInput = React.useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      try {
        await startRecording()
      } catch (error) {
        console.error('Failed to start recording:', error)
        toast({
          title: '无法访问麦克风',
          description: '请检查浏览器权限设置',
          variant: 'destructive',
        })
      }
    }
  }, [isRecording, startRecording, stopRecording, toast])

  // 当录音完成后，自动转文字
  React.useEffect(() => {
    if (audioBlob && !isRecording) {
      const transcribeAudio = async () => {
        setIsTranscribing(true)
        try {
          // 将 Blob 转为 File
          const audioFile = new File([audioBlob], 'recording.webm', {
            type: 'audio/webm',
          })
          
          // 调用语音转文字 API
          const result = await ChatAPI.speechToText(audioFile)
          
          // 将识别结果填充到输入框
          if (result.text) {
            setInput(result.text)
          }
        } catch (error) {
          console.error('Failed to transcribe audio:', error)
          toast({
            title: '语音识别失败',
            description: '请重试或检查网络连接',
            variant: 'destructive',
          })
        } finally {
          setIsTranscribing(false)
          clearAudio()
        }
      }

      transcribeAudio()
    }
  }, [audioBlob, isRecording, clearAudio])

  return (
    <div className="bg-white dark:bg-gray-900 pb-4">
      <div className="mx-auto max-w-3xl px-6">
        <form onSubmit={handleSubmit}>
          <div className={cn(
            'relative flex items-center',
            'bg-gray-100 dark:bg-gray-800 rounded-[26px]',
            'px-4 py-3',
            'transition-all'
          )}>
            {/* 输入框 */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="给 Sky Chat 发送消息"
              disabled={disabled || isRecording || isTranscribing}
              className={cn(
                'flex-1 bg-transparent text-[15px]',
                'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            
            {/* 右侧按钮组 */}
            <div className="flex items-center gap-1 ml-2">
              {/* 麦克风按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                disabled={disabled || isTranscribing}
                className={cn(
                  'h-8 w-8 hover:bg-gray-200 dark:hover:bg-gray-700',
                  isRecording && 'text-red-500 animate-pulse'
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              {/* 发送按钮 */}
              <Button
                type="submit"
                size="icon"
                disabled={disabled || !input.trim() || isRecording || isTranscribing}
                className={cn(
                  'h-8 w-8 rounded-lg',
                  input.trim() && !disabled && !isRecording && !isTranscribing
                    ? 'bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300'
                    : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 状态提示 */}
          {(isRecording || isTranscribing) && (
            <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              {isRecording && '正在录音...'}
              {isTranscribing && '正在识别...'}
            </div>
          )}
        </form>

        {/* 免责声明 */}
        <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Sky Chat 可能会出错。请核对重要信息。
        </div>
      </div>
    </div>
  )
}
