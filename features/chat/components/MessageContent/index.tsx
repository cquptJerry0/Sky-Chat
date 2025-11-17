'use client'

/**
 * Message Content Component - 消息内容渲染器
 * 
 * 负责渲染 Markdown 格式的消息内容
 * 支持：
 * - GFM (GitHub Flavored Markdown)
 * - 代码高亮
 * - 流式传输时的光标显示（智能避开代码块）
 * 
 * @module components/MessageContent
 */

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { rehypeCursor } from '@/features/chat/utils/rehype-cursor'
import { markdownComponents } from './MarkdownComponents'

interface MessageContentProps {
  /** 消息内容（Markdown 格式） */
  content: string
  
  /** 是否正在流式传输 */
  isStreaming?: boolean
  
  /** 是否显示光标（默认 true） */
  showCursor?: boolean
}

/**
 * 消息内容组件
 * 
 * 渲染 Markdown 内容，支持流式传输时显示光标
 * 光标会智能地只出现在文本末尾，避免在代码块中显示
 */
export function MessageContent({
  content,
  isStreaming = false,
  showCursor = true,
}: MessageContentProps) {
  // 只在流式传输且需要显示光标时添加 cursor 插件
  const shouldShowCursor = isStreaming && showCursor
  
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          rehypeHighlight,
          // 动态添加光标插件
          ...(shouldShowCursor ? [rehypeCursor] : []),
        ]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
