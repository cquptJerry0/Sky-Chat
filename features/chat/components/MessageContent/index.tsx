'use client'

/**
 * Message Content Component - 消息内容渲染器
 * 
 * 负责渲染 Markdown 格式的消息内容
 * 支持：
 * - GFM (GitHub Flavored Markdown)
 * - 代码高亮
 * - 流式传输时延迟渲染未闭合的代码块
 * 
 * @module components/MessageContent
 */

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { createMarkdownComponents } from './MarkdownComponents'

interface MessageContentProps {
  /** 消息内容（Markdown 格式） */
  content: string
  
  /** 是否正在流式传输 */
  isStreaming?: boolean
}

/**
 * 预处理流式内容
 * 
 * 检测未闭合的代码块，补上闭合标记让 ReactMarkdown 能正常解析
 * 这样 ChartBlock/WeatherBlock 的占位逻辑就能生效
 * 
 * @param content - 原始内容
 * @param isStreaming - 是否正在流式传输
 * @returns 处理后的内容
 */
function preprocessStreamingContent(content: string, isStreaming: boolean): string {
  if (!isStreaming || !content) return content
  
  // 统计代码块的开始和结束
  const codeBlockPattern = /```/g
  const matches = content.match(codeBlockPattern)
  const count = matches?.length || 0
  
  // 如果没有代码块或代码块数量是偶数（都闭合了），直接返回
  if (count === 0 || count % 2 === 0) {
    return content
  }
  
  // 有未闭合的代码块
  // 检查是否是媒体块（image/chart/weather），如果是则隐藏直到完成
  const lastOpenBlock = content.lastIndexOf('```')
  const afterBlock = content.slice(lastOpenBlock + 3)
  const langMatch = afterBlock.match(/^(\w+)/)
  const lang = langMatch?.[1]
  
  // 如果是媒体块且内容不完整，暂时隐藏整个代码块
  if (lang && ['image', 'chart', 'weather'].includes(lang)) {
    const blockContent = afterBlock.slice(lang.length).trim()
    // 检查是否有完整的 JSON（必须以 { 开始，以 } 结束）
    const jsonStart = blockContent.indexOf('{')
    const jsonEnd = blockContent.lastIndexOf('}')
    
    // JSON 不完整（没开始、没结束、或结束在开始之前），隐藏整个代码块
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      return content.slice(0, lastOpenBlock)
    }
    
    // 尝试解析 JSON，如果解析失败也隐藏
    const jsonStr = blockContent.slice(jsonStart, jsonEnd + 1)
    try {
      JSON.parse(jsonStr)
    } catch {
      // JSON 解析失败，隐藏整个代码块
      return content.slice(0, lastOpenBlock)
    }
  }
  
  // 普通代码块，补上闭合标记
  return content + '\n```'
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
}: MessageContentProps) {
  // 根据流式状态创建 markdown 组件
  const markdownComponents = useMemo(
    () => createMarkdownComponents(isStreaming),
    [isStreaming]
  )
  
  // 预处理内容：流式时延迟渲染未闭合的代码块
  const processedContent = useMemo(
    () => preprocessStreamingContent(content, isStreaming),
    [content, isStreaming]
  )
  
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
