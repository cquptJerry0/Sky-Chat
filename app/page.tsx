'use client'

import * as React from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'

type Message = {
  id: string | number
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (message: string) => {
    if (isLoading) return

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // 创建空的 AI 消息
    const aiMessageId = Date.now() + 1
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
    }
    setMessages((prev) => [...prev, aiMessage])

    try {
      // 发起 SSE 请求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      // 读取流式数据
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim().startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            setIsLoading(false)
            break
          }

          try {
            const { content } = JSON.parse(data)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? { ...msg, content: msg.content + content }
                  : msg
              )
            )
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: '抱歉，发生了错误。请重试。' }
            : msg
        )
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold">Sky Chat</h1>
        <ThemeToggle />
      </header>

      {/* 消息列表 */}
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">
                欢迎使用 Sky Chat
              </h2>
              <p className="mt-2 text-muted-foreground">
                开始对话，体验 SSE 流式打字机效果
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      {/* 输入框 */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
