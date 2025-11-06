/**
 * Chat Message UI Component - 消息 UI 组件
 * 
 * 纯展示组件，负责渲染单条消息
 * 根据 role 区分用户消息和 AI 消息的渲染方式
 * 
 * @module modules/chat-message/ChatMessageUI
 */

import { ThinkingPanel } from '@/components/ThinkingPanel'
import { MessageContent } from '@/components/MessageContent'
import { MessageActions } from '@/components/MessageActions'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Message } from '@/lib/types/chat'

interface ChatMessageUIProps {
  /** 消息数据 */
  message: Message
  
  /** 是否正在流式传输 thinking */
  isStreamingThinking: boolean
  
  /** 是否正在流式传输 answer */
  isStreamingAnswer: boolean
  
  /** 是否正在等待响应 */
  isWaitingForResponse: boolean
  
  /** 重试回调 */
  onRetry?: () => void
}

/**
 * 消息 UI 组件
 * 
 * 渲染单条消息，根据 role 区分样式
 * - user: 右对齐蓝色气泡
 * - assistant: 左对齐，包含 thinking 和 answer 区域
 */
export function ChatMessageUI({
  message,
  isStreamingThinking,
  isStreamingAnswer,
  isWaitingForResponse,
  onRetry,
}: ChatMessageUIProps) {
  const isUser = message.role === 'user'
  
  // ============ 用户消息 ============
  if (isUser) {
    return (
      <div className="w-full py-4">
        <div className="flex justify-end">
          <div className="rounded-3xl bg-[hsl(var(--message-user-bg))] px-5 py-3 max-w-[70%]">
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-[hsl(var(--text-primary))]">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // ============ AI 消息 ============
  const isPending = !message.thinking && !message.content && (isStreamingThinking || isStreamingAnswer || isWaitingForResponse)
  
  return (
    <div className="w-full py-6">
        <div className="space-y-4">
          {/* Pending 状态：显示加载动画 */}
          {isPending && (
            <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">正在思考...</span>
            </div>
          )}
          
          {/* Thinking 面板（独立组件） */}
          {message.thinking && (
            <ThinkingPanel
              content={message.thinking}
              isStreaming={isStreamingThinking}
              defaultExpanded={true}
            />
          )}
          
          {/* Answer 内容 */}
          {message.content && (
            <div className="prose-container">
              <MessageContent
                content={message.content}
                isStreaming={isStreamingAnswer}
                showCursor={true}
              />
            </div>
          )}
          
          {/* 操作按钮（仅在非流式状态且有内容时显示） */}
          {message.content && !isStreamingAnswer && !isStreamingThinking && (
            <MessageActions
              content={message.content}
              messageId={message.id}
              sessionId={message.sessionId}
              hasError={message.hasError}
              onRetry={onRetry}
            />
          )}
          
          {/* 错误重试按钮（独立显示） */}
          {message.hasError && onRetry && (
            <div className="mt-3">
              <Button
                onClick={onRetry}
              className="bg-[hsl(var(--button-primary-bg))] text-white hover:bg-[hsl(var(--button-primary-hover))]"
              >
                重试继续
              </Button>
            </div>
          )}
      </div>
    </div>
  )
}

