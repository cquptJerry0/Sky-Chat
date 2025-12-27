/**
 * 消息展示组件
 * 用于分享页面的消息渲染
 * 
 * Hydration Mismatch 处理：
 * - 时间戳使用 useEffect 延迟渲染，避免 SSR/CSR 时区差异导致的不一致
 * - 随机锚点 ID 延迟生成，确保 SSR/CSR HTML 一致
 */

'use client'

import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientValue } from '@/features/share/hooks/use-client-value'
import 'highlight.js/styles/github-dark.css' // 引入高亮样式

interface Message {
  id: string
  role: string
  content: string
  thinking?: string | null
  createdAt: string
}

interface MessageDisplayProps {
  message: Message
}

/**
 * 格式化时间戳
 * 仅在客户端调用，避免 SSR/CSR 时区差异
 */
function formatMessageTime(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 生成消息锚点 ID
 * 用于复制消息链接时的定位
 */
function generateAnchorId(messageId: string): string {
  return `msg_${messageId}_${Math.random().toString(36).slice(2, 8)}`
}

export function MessageDisplay({ message }: MessageDisplayProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  // Hydration Mismatch 处理：时间戳延迟至 useEffect 阶段渲染
  // SSR 阶段显示 ISO 日期部分，CSR 阶段显示本地化时间
  const messageTime = useClientValue(
    () => formatMessageTime(message.createdAt),
    message.createdAt.split('T')[0] // SSR 安全的初始值
  )
  
  // Hydration Mismatch 处理：随机 ID 延迟至 useEffect 阶段生成
  // SSR 阶段使用稳定的 messageId，CSR 阶段生成带随机后缀的锚点 ID
  const anchorId = useClientValue(
    () => generateAnchorId(message.id),
    `msg_${message.id}` // SSR 安全的初始值
  )
  
  return (
    <div id={anchorId} className="group relative">
      {/* 消息容器 */}
      <div
        className={cn(
          'rounded-lg border p-6',
          isUser 
            ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
            : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30'
        )}
      >
        {/* 消息头部 */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isUser ? (
              <>
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  用户
                </span>
              </>
            ) : isAssistant ? (
              <>
                <Bot className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  助手
                </span>
              </>
            ) : (
              <span className="font-semibold text-gray-900 dark:text-gray-200">
                系统
              </span>
            )}
          </div>
          
          <span className="text-xs text-muted-foreground">
            {messageTime}
          </span>
        </div>
        
        {/* 思考过程（如果有）- HTML 直出 */}
        {message.thinking && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
            <div className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
              思考过程
            </div>
            <div 
              className="prose prose-sm prose-yellow max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: message.thinking }}
            />
          </div>
        )}
        
        {/* 消息内容 - HTML 直出 */}
        <div 
          className="prose prose-gray max-w-none dark:prose-invert break-words prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
    </div>
  )
}
