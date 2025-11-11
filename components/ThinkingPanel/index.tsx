'use client'

/**
 * Thinking Panel Component - 思考过程面板
 * 
 * 独立的可折叠面板，用于显示 AI 的推理过程
 * 
 * 特性：
 * - 可折叠/展开
 * - 独立滚动区域（最大高度 96）
 * - 流式传输状态指示
 * - 视觉上明显区别于回答区域
 * 
 * @module components/ThinkingPanel
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Brain } from 'lucide-react'
import { MessageContent } from '@/components/MessageContent'

interface ThinkingPanelProps {
  /** 思考内容（Markdown 格式） */
  content: string
  
  /** 是否正在流式传输 */
  isStreaming?: boolean
  
  /** 默认是否展开 */
  defaultExpanded?: boolean
}

/**
 * 思考过程面板组件
 * 
 * 显示 AI 的推理过程，支持折叠/展开
 * 使用蓝色主题以区别于回答区域
 */
export function ThinkingPanel({
  content,
  isStreaming = false,
  defaultExpanded = true,
}: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // 自动滚动到底部 - 当内容更新且正在流式传输时
  useEffect(() => {
    if (isStreaming && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isStreaming, isExpanded])
  
  // 如果没有内容，不渲染
  if (!content) return null
  
  return (
    <div className="mb-4 border border-border/30 bg-muted/10 dark:bg-gray-900/30 rounded-xl overflow-hidden transition-all duration-300">
      {/* 可折叠的标题栏 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 dark:hover:bg-gray-800/30 transition-colors duration-200 group"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? '折叠思考过程' : '展开思考过程'}
      >
        <div className="flex items-center gap-2.5">
          <Brain className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isStreaming ? '思考中' : '思考完成'}
          </span>
          {/* 流式传输指示器 */}
          {isStreaming && (
            <span 
              className="inline-flex h-2 w-2 rounded-full bg-muted-foreground animate-pulse"
              aria-label="正在思考"
            />
          )}
        </div>
        {/* 折叠图标 - 带旋转动画 */}
        <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-all duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
      </button>
      
      {/* 可折叠的内容区域 - 带动画过渡 */}
      <div 
        className={`transition-all duration-200 ease-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div 
          ref={contentRef}
          className={`px-4 py-3 overflow-y-auto ${isExpanded ? 'max-h-[500px]' : 'h-0'}`}
        >
      {isExpanded && (
          <MessageContent
            content={content}
            isStreaming={isStreaming}
            showCursor={true}
          />
          )}
        </div>
      </div>
    </div>
  )
}

