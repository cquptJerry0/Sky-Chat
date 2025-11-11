/**
 * 消息展示组件
 * 用于分享页面的消息渲染
 */

import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function MessageDisplay({ message }: MessageDisplayProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  const messageTime = new Date(message.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  return (
    <div className="group relative">
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
        
        {/* 思考过程（如果有） */}
        {message.thinking && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
            <div className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
              思考过程
            </div>
            <div className="whitespace-pre-wrap text-sm text-yellow-700 dark:text-yellow-300">
              {message.thinking}
            </div>
          </div>
        )}
        
        {/* 消息内容 */}
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap break-words">
            {formatContent(message.content)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 格式化消息内容
 * 处理代码块、链接等格式
 */
function formatContent(content: string): React.ReactNode {
  // 简单的格式化处理
  // TODO: 可以添加更复杂的 markdown 渲染
  
  // 处理代码块
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const parts = content.split(codeBlockRegex)
  
  const elements: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // 普通文本
      if (parts[i]) {
        elements.push(
          <span key={i}>{parts[i]}</span>
        )
      }
    } else if (i % 3 === 2) {
      // 代码块内容
      const language = parts[i - 1] || 'plaintext'
      elements.push(
        <pre key={i} className="overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100">
          <code className={`language-${language}`}>
            {parts[i]}
          </code>
        </pre>
      )
    }
  }
  
  return elements.length > 0 ? elements : content
}
