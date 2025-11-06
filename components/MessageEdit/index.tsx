'use client'

/**
 * Message Edit Component - 消息编辑组件
 * 
 * 将消息内容变成可编辑的textarea，提供取消和发送按钮
 * 
 * @module components/MessageEdit
 */

import * as React from 'react'
import { Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageEditProps {
  /** 原始消息内容 */
  originalContent: string
  /** 取消编辑回调 */
  onCancel: () => void
  /** 发送编辑后的消息回调 */
  onSend: (newContent: string) => void
}

export function MessageEdit({ originalContent, onCancel, onSend }: MessageEditProps) {
  const [content, setContent] = React.useState(originalContent)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  
  // 自动聚焦
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(content.length, content.length)
    }
  }, [])
  
  // 自动调整textarea高度
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])
  
  const handleSend = () => {
    const trimmedContent = content.trim()
    if (trimmedContent && trimmedContent !== originalContent) {
      onSend(trimmedContent)
    } else if (!trimmedContent) {
      onCancel()
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }
  
  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full min-h-[100px] p-3 border border-border rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-800"
        placeholder="编辑消息..."
      />
      
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 px-3 text-sm"
        >
          <X className="h-4 w-4 mr-1" />
          取消
        </Button>
        
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!content.trim() || content.trim() === originalContent}
          className="h-8 px-3 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-4 w-4 mr-1" />
          发送
        </Button>
      </div>
    </div>
  )
}

