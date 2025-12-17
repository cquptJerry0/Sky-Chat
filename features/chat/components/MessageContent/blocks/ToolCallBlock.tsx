'use client'

/**
 * 工具调用块组件
 *
 * 展示 AI 工具调用状态（如联网搜索）
 */

import { useMemo } from 'react'
import { Search, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { MediaBlockProps } from './registry'

interface ToolCallData {
  type: 'tool_call' | 'tool_result'
  name: string
  query?: string
  resultCount?: number
  success?: boolean
}

export function ToolCallBlock({ data, isStreaming }: MediaBlockProps) {
  const toolData = useMemo(() => {
    const trimmed = data.trim()
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as ToolCallData
      } catch {
        return null
      }
    }
    return null
  }, [data])

  if (!toolData) {
    return null
  }

  // 搜索中状态
  if (toolData.type === 'tool_call' && toolData.name === 'web_search') {
    return (
      <div className="my-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          ) : (
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            正在搜索
          </p>
          {toolData.query && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {toolData.query}
            </p>
          )}
        </div>
      </div>
    )
  }

  // 搜索完成状态
  if (toolData.type === 'tool_result' && toolData.name === 'web_search') {
    const isSuccess = toolData.success !== false
    
    return (
      <div className={`my-3 flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isSuccess 
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50'
      }`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
          isSuccess
            ? 'bg-green-100 dark:bg-green-900'
            : 'bg-red-100 dark:bg-red-900'
        }`}>
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            isSuccess
              ? 'text-green-900 dark:text-green-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {isSuccess ? '搜索完成' : '搜索失败'}
          </p>
          {isSuccess && toolData.resultCount !== undefined && (
            <p className="text-xs text-green-700 dark:text-green-300">
              找到 {toolData.resultCount} 条相关结果
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}
