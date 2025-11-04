'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message } from '@/lib/types/chat'
import { ChatAPI } from '@/lib/services/chat-api'
import { MessageProcessor } from '@/lib/processors/message-processor'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return

      abortControllerRef.current = new AbortController()

      const userMsg = MessageProcessor.createMessage('user', content)
      const aiMsg = MessageProcessor.createMessage('assistant')

      setMessages((prev) => [...prev, userMsg, aiMsg])
      setIsLoading(true)

      try {
        const response = await ChatAPI.sendMessage(
          content,
          abortControllerRef.current.signal
        )

        const sessionId = response.headers.get('X-Session-ID')
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No reader')

        if (sessionId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsg.id ? { ...m, sessionId } : m))
          )
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const sseDataList = MessageProcessor.parseSSE(chunk)

          for (const sseData of sseDataList) {
            setMessages((prev) =>
              MessageProcessor.updateMessage(prev, aiMsg.id, sseData)
            )
          }
        }

        setMessages((prev) => MessageProcessor.completeMessage(prev, aiMsg.id))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setMessages((prev) => MessageProcessor.completeMessage(prev, aiMsg.id))
        } else {
          setMessages((prev) => MessageProcessor.markError(prev, aiMsg.id))
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [isLoading]
  )

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  const retryMessage = useCallback(
    (message: Message) => {
      if (!message.sessionId) return
      const userMsg = messages.find(
        (m) => m.role === 'user' && messages.indexOf(m) < messages.indexOf(message)
      )
      if (userMsg) {
        setMessages((prev) => prev.filter((m) => m.id !== message.id))
        sendMessage(userMsg.content)
      }
    },
    [messages, sendMessage]
  )

  const clearMessages = useCallback(() => {
    abort()
    setMessages([])
  }, [abort])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    abort,
    retryMessage,
    clearMessages,
  }
}

