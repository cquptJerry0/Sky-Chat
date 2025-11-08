'use client'

/**
 * Chat Message Module - 消息模块
 * 
 * Container Component（容器组件）
 * 连接 Store，最小化 props（只接收 messageId）
 * 
 * 架构：
 * - useChatStore: 获取消息数据和流式状态
 * - ChatMessageUI: 纯 UI 组件
 * 
 * @module modules/chat-message
 */

import { useChatStore } from '@/lib/stores/chat.store'
import { ChatMessageUI } from './ChatMessageUI'

interface ChatMessageProps {
  /** 消息 ID（唯一 prop） */
  messageId: string
}

/**
 * 消息模块容器组件
 * 
 * 最小化 props 设计，只接收 messageId
 * 所有数据从 store 中根据 ID 获取
 */
export function ChatMessage({ messageId }: ChatMessageProps) {
  // 从 store 获取消息数据
  const message = useChatStore((s) => 
    s.messages.find((m) => m.id === messageId)
  )
  
  // 从 store 获取流式状态
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const streamingPhase = useChatStore((s) => s.streamingPhase)
  const isLoading = useChatStore((s) => s.isLoading)
  const messages = useChatStore((s) => s.messages)
  
  // 获取重试、编辑和继续生成方法
  const retryMessage = useChatStore((s) => s.retryMessage)
  const editAndResend = useChatStore((s) => s.editAndResend)
  const continueGeneration = useChatStore((s) => s.continueGeneration)
  
  // 如果消息不存在，不渲染
  if (!message) {
    return null
  }
  
  // 判断当前消息是否正在流式传输
  const isStreaming = streamingMessageId === messageId
  const isStreamingThinking = isStreaming && streamingPhase === 'thinking'
  const isStreamingAnswer = isStreaming && streamingPhase === 'answer'
  
  // 判断是否是最新的AI消息且正在loading
  const isLastMessage = messages[messages.length - 1]?.id === messageId
  const isAIMessage = message.role === 'assistant'
  const isWaitingForResponse = isLoading && isLastMessage && isAIMessage
  
  // 重试逻辑
  const handleRetry = message.hasError ? () => {
    // 删除错误消息
    retryMessage(messageId)
    
    // 获取最后一个用户消息并重新发送
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage?.content) {
      // 触发重新发送（通过创建一个自定义事件）
      window.dispatchEvent(new CustomEvent('retry-message', {
        detail: { content: lastUserMessage.content }
      }))
    }
  } : undefined
  
  // 编辑逻辑（仅用户消息）
  const handleEdit = message.role === 'user' ? (newContent: string) => {
    editAndResend(messageId, newContent)
  } : undefined
  
  // 继续生成逻辑（仅AI消息且非流式状态且未loading）
  const handleContinue = (message.role === 'assistant' && !isStreamingThinking && !isStreamingAnswer && !isLoading) 
    ? () => {
        continueGeneration(messageId)
      } 
    : undefined
  
  return (
    <ChatMessageUI
      message={message}
      isStreamingThinking={isStreamingThinking}
      isStreamingAnswer={isStreamingAnswer}
      isWaitingForResponse={isWaitingForResponse}
      onRetry={handleRetry}
      onEdit={handleEdit}
      onContinue={handleContinue}
    />
  )
}

