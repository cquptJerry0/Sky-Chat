'use client'

import * as React from 'react'
import { ArrowUp, Mic, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioRecorder } from '@/lib/hooks/use-audio-recorder'
import { ChatAPI } from '@/lib/services/chat-api'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = React.useState('')
  const [isTranscribing, setIsTranscribing] = React.useState(false)
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearAudio,
  } = useAudioRecorder()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      try {
        await startRecording()
      } catch (error) {
        console.error('Failed to start recording:', error)
      }
    }
  }

  React.useEffect(() => {
    if (audioBlob && !isRecording) {
      const transcribe = async () => {
        setIsTranscribing(true)
        try {
          const audioFile = new File([audioBlob], 'recording.webm', {
            type: 'audio/webm',
          })
          const result = await ChatAPI.speechToText(audioFile)
          setInput(result.text)
          clearAudio()
        } catch (error) {
          console.error('Transcription failed:', error)
        } finally {
          setIsTranscribing(false)
        }
      }
      transcribe()
    }
  }, [audioBlob, isRecording, clearAudio])

  return (
    <div className="bg-background pb-6 pt-4">
      <div className="mx-auto max-w-3xl px-4">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="给 Sky Chat 发送消息"
            disabled={disabled || isRecording || isTranscribing}
            rows={1}
            className={cn(
              'w-full resize-none rounded-3xl border border-input bg-background px-5 py-4 pr-24 text-sm shadow-sm transition-colors',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-32 overflow-y-auto'
            )}
            style={{
              height: 'auto',
              minHeight: '56px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleMicClick}
              disabled={disabled || isTranscribing}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                (disabled || isTranscribing) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isRecording ? '停止录音' : '开始录音'}
              </span>
            </button>
            <button
              type="submit"
              disabled={disabled || !input.trim() || isRecording || isTranscribing}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                input.trim() && !disabled && !isRecording && !isTranscribing
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <ArrowUp className="h-5 w-5" />
              <span className="sr-only">发送</span>
            </button>
          </div>
        </form>
        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            正在录音...
          </div>
        )}
      </div>
    </div>
  )
}
