'use client'

import * as React from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { TabSyncManager, LeaderElection } from '@/lib/tab-sync'
import { Button } from '@/components/ui/button'
import { Square } from 'lucide-react'
import type { 
  MessageSyncPayload,
  StreamSyncPayload,
  LoadingStateSyncPayload,
} from '@/lib/tab-sync/types'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  hasError?: boolean
  sessionId?: string
  userMessage?: string
}

export default function Home() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLeader, setIsLeader] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  const tabSyncRef = React.useRef<TabSyncManager | null>(null)
  const leaderElectionRef = React.useRef<LeaderElection | null>(null)
  // 中断控制器引用
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const scrollToBottom = React.useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  React.useEffect(() => {
    tabSyncRef.current = new TabSyncManager()
    leaderElectionRef.current = new LeaderElection()

    leaderElectionRef.current.requestLeadership((leader) => {
      setIsLeader(leader)
    })

    const handleMessageAdd = (payload: MessageSyncPayload) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === payload.id)) {
          return prev
        }
        return [...prev, payload as Message]
      })
    }

    const handleMessageStream = (payload: StreamSyncPayload) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === payload.messageId
            ? {
                ...msg,
                content: payload.content,
                sessionId: payload.sessionId || msg.sessionId,
              }
            : msg
        )
      )
    }

    const handleLoadingState = (payload: LoadingStateSyncPayload) => {
      setIsLoading(payload.isLoading)
    }

    tabSyncRef.current.on('MESSAGE_ADD', handleMessageAdd)
    tabSyncRef.current.on('MESSAGE_STREAM', handleMessageStream)
    tabSyncRef.current.on('LOADING_STATE', handleLoadingState)

    return () => {
      tabSyncRef.current?.close()
      leaderElectionRef.current?.release()
    }
  }, [])

  // 停止生成
  const handleStop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
    }
  }, [])

  // 防抖 - 防止快速连续发送
  const sendingRef = React.useRef(false)
  
  const handleSend = async (
    message: string,
    resumeSessionId?: string,
    existingMessageId?: string
  ) => {
    // 防止重复发送
    if (isLoading || sendingRef.current) return
    
    sendingRef.current = true

    // 创建新的中断控制器
    abortControllerRef.current = new AbortController()

    let aiMessageId = existingMessageId

    if (!resumeSessionId) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
      }
      setMessages((prev) => [...prev, userMessage])
      
      tabSyncRef.current?.broadcast('MESSAGE_ADD', userMessage)

      setIsLoading(true)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: true })

      aiMessageId = (Date.now() + 1).toString()
      const aiMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
      }
      setMessages((prev) => [...prev, aiMessage])
      tabSyncRef.current?.broadcast('MESSAGE_ADD', aiMessage)
    } else {
      setIsLoading(true)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: true })
    }

    if (!isLeader) {
      return
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          resumeSessionId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const sessionId = response.headers.get('X-Session-ID')
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      if (sessionId && aiMessageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, sessionId, userMessage: message }
              : msg
          )
        )
      }

      while (true) {
        try {
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
              tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
              break
            }

            try {
              const { content } = JSON.parse(data)
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + content }
                    : msg
                )
                
                const currentMessage = updated.find((m) => m.id === aiMessageId)
                if (currentMessage && aiMessageId) {
                  tabSyncRef.current?.broadcast('MESSAGE_STREAM', {
                    messageId: aiMessageId,
                    content: currentMessage.content,
                    sessionId: currentMessage.sessionId,
                  })
                }
                
                return updated
              })
              scrollToBottom()
            } catch {
              // Ignore malformed SSE data
            }
          }
        } catch {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, hasError: true } : msg
            )
          )
          setIsLoading(false)
          tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
          break
        }
      }
    } catch (error) {
      // 处理中断错误（用户主动停止）
      if (error instanceof Error && error.name === 'AbortError') {
        // 保持当前内容，不标记错误
        setIsLoading(false)
        tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
      } else {
        // 其他错误（如网络错误）
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                  content: msg.content || '抱歉，发生了错误。请检查网络连接。',
                hasError: true,
              }
            : msg
        )
      )
      setIsLoading(false)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
    }
    } finally {
      abortControllerRef.current = null
      // 重置防抖标记
      setTimeout(() => {
        sendingRef.current = false
      }, 300)
    }
  }

  // 继续生成（断点续传）
  const handleResume = React.useCallback((msg: Message) => {
    if (msg.sessionId && msg.userMessage) {
      handleSend(msg.userMessage, msg.sessionId, msg.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 清理中断控制器
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleRetry = (msg: Message) => {
    if (msg.sessionId && msg.userMessage) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, hasError: false } : m))
      )
      handleSend(msg.userMessage, msg.sessionId, msg.id)
    }
  }

  // 清空消息（新建对话）
  const handleNewChat = React.useCallback(() => {
    handleStop()
    setMessages([])
  }, [handleStop])

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 */}
      <Sidebar isLeader={isLeader} onNewChat={handleNewChat} />

      {/* 主聊天区域 */}
      <div className="flex flex-1 flex-col h-screen">
        {/* 消息列表 */}
        <main ref={messagesContainerRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-200">
                  我能帮你什么？
                </h2>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLastAssistant = 
                  isLoading &&
                  index === messages.length - 1 &&
                  message.role === 'assistant'
                
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={isLastAssistant}
                    hasError={message.hasError}
                    onRetry={
                      message.hasError ? () => handleRetry(message) : undefined
                    }
                  />
                )
              })}
              <div ref={messagesEndRef} className="h-32" />
            </>
          )}
        </main>

        {/* 输入框上方的操作按钮（居中悬浮） */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
          {/* 停止生成按钮 */}
          {isLoading && (
            <Button
              onClick={handleStop}
              className="gap-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
            >
              <Square className="h-3 w-3" fill="currentColor" />
              <span className="text-sm">停止生成</span>
            </Button>
          )}

          {/* 继续生成按钮（最后一条 AI 消息可继续时显示） */}
          {!isLoading && messages.length > 0 && (() => {
            const lastMessage = messages[messages.length - 1]
            const canResume = 
              lastMessage.role === 'assistant' && 
              lastMessage.sessionId && 
              !lastMessage.hasError
            
            return canResume && (
              <Button
                onClick={() => handleResume(lastMessage)}
                className="gap-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                <span className="text-sm">继续</span>
              </Button>
            )
          })()}
        </div>

        {/* 输入框（固定在底部） */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  )
}
