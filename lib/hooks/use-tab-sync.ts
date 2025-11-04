'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message } from '@/lib/types/chat'
import { ChatAPI } from '@/lib/services/chat-api'
import { MessageProcessor } from '@/lib/processors/message-processor'
import {
  TabSyncManager,
  LeaderElection,
  type MessageSyncPayload,
  type StreamSyncPayload,
  type LoadingStateSyncPayload,
} from '@/lib/tab-sync'

export function useTabSync() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLeader, setIsLeader] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const tabSyncRef = useRef<TabSyncManager | null>(null)
  const leaderElectionRef = useRef<LeaderElection | null>(null)

  useEffect(() => {
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

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return

      abortControllerRef.current = new AbortController()

      const userMsg = MessageProcessor.createMessage('user', content)
      const aiMsg = MessageProcessor.createMessage('assistant')

      setMessages((prev) => [...prev, userMsg, aiMsg])
      tabSyncRef.current?.broadcast('MESSAGE_ADD', userMsg)
      tabSyncRef.current?.broadcast('MESSAGE_ADD', aiMsg)

      setIsLoading(true)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: true })

      if (!isLeader) {
        return
      }

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
            setMessages((prev) => {
              const updated = MessageProcessor.updateMessage(
                prev,
                aiMsg.id,
                sseData
              )
              const currentMsg = updated.find((m) => m.id === aiMsg.id)
              if (currentMsg) {
                tabSyncRef.current?.broadcast('MESSAGE_STREAM', {
                  messageId: aiMsg.id,
                  content: currentMsg.content,
                  sessionId: currentMsg.sessionId,
                })
              }
              return updated
            })
          }
        }

        setMessages((prev) => MessageProcessor.completeMessage(prev, aiMsg.id))
        setIsLoading(false)
        tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setMessages((prev) => MessageProcessor.completeMessage(prev, aiMsg.id))
        } else {
          setMessages((prev) => MessageProcessor.markError(prev, aiMsg.id))
        }
        setIsLoading(false)
        tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
      } finally {
        abortControllerRef.current = null
      }
    },
    [isLoading, isLeader]
  )

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
    }
  }, [])

  const retryMessage = useCallback(
    (message: Message) => {
      if (!message.sessionId) return
      const userMsg = messages.find(
        (m) =>
          m.role === 'user' && messages.indexOf(m) < messages.indexOf(message)
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
    isLeader,
    sendMessage,
    abort,
    retryMessage,
    clearMessages,
  }
}
