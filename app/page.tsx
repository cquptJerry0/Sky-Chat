'use client'

import { useRef, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { useTabSync } from '@/lib/hooks/use-tab-sync'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Home() {
  const { messages, isLoading, isLeader, sendMessage, retryMessage, abort } =
    useTabSync()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {isLeader && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              主标签页
            </span>
          )}
        </div>
        <ThemeToggle />
      </header>

      <main ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center pb-32">
            <div className="text-center">
              <h2 className="text-4xl font-medium text-foreground">
                我能帮你什么？
              </h2>
              <p className="mt-4 text-sm text-muted-foreground">
                支持文字输入和语音输入
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={
                  isLoading &&
                  index === messages.length - 1 &&
                  message.role === 'assistant'
                }
                hasError={message.hasError}
                onRetry={
                  message.hasError ? () => retryMessage(message) : undefined
                }
              />
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </main>

      {isLoading && (
        <div className="px-4 pb-2">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={abort}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm',
                'hover:bg-muted transition-colors'
              )}
            >
              <X className="h-4 w-4" />
              停止生成
            </button>
          </div>
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  )
}
