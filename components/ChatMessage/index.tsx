'use client'

import { cn } from '@/lib/utils'
import { MessageContent } from '@/components/MessageContent'
import { AudioControl } from '@/components/AudioControl'
import { User, Bot, RotateCw } from 'lucide-react'
import type { Message } from '@/lib/types/chat'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  onRetry?: () => void
  hasError?: boolean
}

export function ChatMessage({
  message,
  isStreaming,
  onRetry,
  hasError,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('w-full py-8', !isUser && 'bg-muted/30')}>
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex gap-4">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              isUser ? 'bg-blue-500 text-white' : 'bg-green-600 text-white'
            )}
          >
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-5 w-5" />}
          </div>

          <div className="flex-1 space-y-2 overflow-hidden pt-1">
            <MessageContent
              content={message.content}
              isStreaming={isStreaming && !isUser}
            />

            {!isUser && message.content && !isStreaming && (
              <div className="flex items-center gap-2">
                <AudioControl text={message.content} />
              </div>
            )}

            {hasError && onRetry && (
              <div className="mt-3">
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90 transition-colors"
                >
                  <RotateCw className="h-4 w-4" />
                  重试
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
