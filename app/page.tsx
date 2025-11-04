'use client'

import { useRef, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { useTabSync } from '@/lib/hooks/use-tab-sync'

export default function Home() {
  const { messages, isLoading, isLeader, sendMessage, retryMessage } =
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
      <header className="flex items-center justify-between px-4 py-3">
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

      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  )
}
