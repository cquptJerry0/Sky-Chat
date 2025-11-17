/**
 * Chat Message UI Component - 消息 UI 组件
 * 
 * 纯展示组件，负责渲染单条消息
 * 根据 role 区分用户消息和 AI 消息的渲染方式
 * 
 * @module modules/chat-message/ChatMessageUI
 */

import * as React from 'react'
import { ThinkingPanel } from '@/features/chat/components/ThinkingPanel'
import { MessageContent } from '@/features/chat/components/MessageContent'
import { MessageActions } from '@/features/chat/components/MessageActions'
import { MessageEdit } from '@/features/chat/components/MessageEdit'
import { Button } from '@/components/ui/button'
import { Loader2, Edit2 } from 'lucide-react'
import { MarkdownIcon } from '@/components/icons/MarkdownIcon'
import { TextFileIcon } from '@/components/icons/TextFileIcon'
import { cn } from '@/lib/utils'
import type { Message } from '@/features/chat/types/chat'

interface ChatMessageUIProps {
  /** 消息数据 */
  message: Message
  
  /** 是否正在流式传输 thinking */
  isStreamingThinking: boolean
  
  /** 是否正在流式传输 answer */
  isStreamingAnswer: boolean
  
  /** 是否正在等待响应 */
  isWaitingForResponse: boolean
  
  /** 是否是最后一条助手消息 */
  isLastAssistantMessage?: boolean
  
  /** 重试回调 */
  onRetry?: () => void
  
  /** 编辑并重新发送回调 */
  onEdit?: (newContent: string) => void
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
  isLastAssistantMessage,
  onRetry,
  onEdit,
}: ChatMessageUIProps) {
  const isUser = message.role === 'user'
  const [isEditing, setIsEditing] = React.useState(false)

  // 获取消息显示状态
  const displayState = message.displayState || 'idle'

  // 根据 displayState 计算实际的显示状态
  const isActuallyStreaming = displayState === 'streaming' || isStreamingThinking || isStreamingAnswer
  
  // ============ 用户消息 ============
  if (isUser) {
    return (
      <div className="w-full py-4 group">
        <div className="flex justify-end items-start gap-2">
          {/* 编辑按钮（hover显示） */}
          {onEdit && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}

          <div className="max-w-[70%] flex flex-col items-end gap-2">
            {/* 文件附件标签 */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-end">
                {message.attachments.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                      file.type === 'md'
                        ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    )}
                  >
                    {file.type === 'md' ? (
                      <MarkdownIcon className="h-3 w-3 text-orange-500" />
                    ) : (
                      <TextFileIcon className="h-3 w-3 text-blue-500" />
                    )}
                    <span className={cn(
                      "font-medium",
                      file.type === 'md'
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-blue-700 dark:text-blue-300"
                    )}>
                      {file.name}
                    </span>
                    <span className={cn(
                      "text-xs",
                      file.type === 'md'
                        ? "text-orange-500 dark:text-orange-400"
                        : "text-blue-500 dark:text-blue-400"
                    )}>
                      {(file.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 消息内容 */}
            {isEditing ? (
              <MessageEdit
                originalContent={message.content}
                onCancel={() => setIsEditing(false)}
                onSend={(newContent) => {
                  setIsEditing(false)
                  onEdit?.(newContent)
                }}
              />
            ) : (
              <div className="rounded-3xl bg-[hsl(var(--message-user-bg))] px-5 py-3">
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-[hsl(var(--text-primary))]">
                  {message.content}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // ============ AI 消息 ============

  // 根据 displayState 决定显示内容
  const showWaitingIndicator = displayState === 'waiting' && !message.thinking && !message.content
  const showErrorIndicator = (displayState === 'error' || message.hasError) && !message.content

  return (
    <div className="w-full py-6">
        <div className="space-y-4">
          {/* Waiting 状态：等待响应 */}
          {showWaitingIndicator && (
            <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">等待响应...</span>
            </div>
          )}

          {/* Error 状态：显示错误提示 */}
          {showErrorIndicator && (
            <div className="flex items-center gap-2 text-red-500">
              <span className="text-sm">生成失败</span>
            </div>
          )}

          {/* Thinking 面板（独立组件） */}
          {message.thinking && (
            <ThinkingPanel
              content={message.thinking}
              isStreaming={isActuallyStreaming && isStreamingThinking}
              defaultExpanded={true}
            />
          )}

          {/* Answer 内容 */}
          {message.content && (
            <div className="prose-container">
              <MessageContent
                content={message.content}
                isStreaming={isActuallyStreaming && isStreamingAnswer}
                showCursor={isActuallyStreaming}
              />
            </div>
          )}

          {/* 操作按钮（仅在非流式状态且有内容时显示，包含错误重试） */}
          {message.content && !isActuallyStreaming && (
            <MessageActions
              content={message.content}
              messageId={message.id}
              role={message.role as 'user' | 'assistant'}
              hasError={message.hasError}
              onRetry={onRetry}
            />
          )}
      </div>
    </div>
  )
}

