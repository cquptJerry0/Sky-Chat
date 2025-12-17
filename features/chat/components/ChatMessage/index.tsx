'use client'

/**
 * Chat Message Module - 消息模块
 * 
 * Container Component（容器组件）
 * 连接 Store，最小化 props（只接收 messageId）
 * 
 * @module modules/chat-message
 */

import { useParams } from 'next/navigation'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ChatService } from '@/features/chat/services/chat.service'
import { ChatMessageUI } from './ChatMessageUI'

interface ChatMessageProps {
  messageId: string
}

export function ChatMessage({ messageId }: ChatMessageProps) {
  const params = useParams()
  const conversationId = params.conversationId as string

  // Store 数据
  const message = useChatStore((s) => s.messages.find((m) => m.id === messageId))
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const streamingPhase = useChatStore((s) => s.streamingPhase)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const messages = useChatStore((s) => s.messages)

  if (!message) return null

  // 流式状态
  const isStreaming = streamingMessageId === messageId
  const isStreamingThinking = isStreaming && streamingPhase === 'thinking'
  const isStreamingAnswer = isStreaming && streamingPhase === 'answer'

  // 位置判断
  const isLastMessage = messages[messages.length - 1]?.id === messageId
  const isAIMessage = message.role === 'assistant'
  const isWaitingForResponse = isSendingMessage && isLastMessage && isAIMessage
  const isLastAssistantMessage = isAIMessage && isLastMessage
  
  // 操作回调
  const handleRetry = isAIMessage 
    ? () => ChatService.retryMessage(conversationId, messageId) 
    : undefined
  
  const handleEdit = message.role === 'user' 
    ? (newContent: string) => ChatService.editAndResend(conversationId, messageId, newContent) 
    : undefined

  return (
    <ChatMessageUI
      message={message}
      isStreamingThinking={isStreamingThinking}
      isStreamingAnswer={isStreamingAnswer}
      isWaitingForResponse={isWaitingForResponse}
      isLastAssistantMessage={isLastAssistantMessage}
      onRetry={handleRetry}
      onEdit={handleEdit}
    />
  )
}

