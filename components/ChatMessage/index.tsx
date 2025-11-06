'use client'

import { cn } from '@/lib/utils'
import { MessageContent } from '@/components/MessageContent'
import { MessageActions } from '@/components/MessageActions'
import { Button } from '@/components/ui/button'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sessionId?: string
  userMessage?: string
}

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  hasError?: boolean
  canResume?: boolean
  onRetry?: () => void
  onResume?: () => void
}

export function ChatMessage({
  message,
  isStreaming,
  hasError,
  canResume,
  onRetry,
  onResume,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  // 用户消息：浅灰气泡，右对齐，无头像
  if (isUser) {
    return (
      <div className="w-full py-3 px-4">
        <div className="mx-auto max-w-3xl flex justify-end">
          <div
            className={cn(
              'rounded-3xl bg-gray-100 dark:bg-gray-700 px-5 py-3 max-w-[70%]',
              'text-gray-900 dark:text-gray-100'
            )}
          >
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // AI 消息：占整行，左对齐，无头像，极简背景
  return (
    <div className={cn(
      'w-full py-6 px-4',
      'bg-white dark:bg-gray-900'
    )}>
      <div className="mx-auto max-w-3xl">
        <div className="space-y-3">
          <MessageContent
            content={message.content}
            isStreaming={isStreaming}
          />

          {/* AI 消息操作按钮 */}
          {message.content && !isStreaming && (
            <MessageActions
              content={message.content}
              messageId={message.id}
              sessionId={message.sessionId}
              hasError={hasError}
              canResume={canResume}
              onRetry={onRetry}
              onResume={onResume}
            />
          )}

          {/* 错误重试按钮（独立显示，更显眼） */}
          {hasError && onRetry && (
            <div className="mt-3">
              <Button
                onClick={onRetry}
                className="bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                重试继续
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
