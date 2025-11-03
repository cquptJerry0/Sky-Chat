'use client'

import { cn } from '@/lib/utils'

type Message = {
  id: string | number
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'w-full border-b border-border py-6',
        isUser ? 'bg-user-message' : 'bg-ai-message'
      )}
    >
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex gap-4">
          {/* 头像 */}
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-sm font-semibold',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {isUser ? 'U' : 'AI'}
          </div>

          {/* 消息内容 */}
          <div className="flex-1 space-y-2 overflow-hidden">
            <p className="whitespace-pre-wrap break-words leading-7">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
