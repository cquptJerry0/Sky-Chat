/**
 * Chat Input UI Component - 输入框 UI 组件
 * 
 * 纯展示组件，接收所有状态和方法通过 props
 * 负责：
 * - 输入框渲染
 * - 思考模式开关
 * - 录音按钮
 * - 发送/停止按钮
 * 
 * @module modules/chat-input/ChatInputUI
 */

import * as React from 'react'
import { ArrowUp, Mic, Loader2, Brain, Square, X, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MarkdownIcon } from '@/components/icons/MarkdownIcon'
import { TextFileIcon } from '@/components/icons/TextFileIcon'
import { getModelById } from '@/features/chat/constants/models'
import { cn } from '@/lib/utils'

interface ChatInputUIProps {
  // 状态
  input: string
  setInput: (value: string) => void
  selectedModel: string
  enableThinking: boolean
  isLoading: boolean
  isRecording: boolean
  isTranscribing: boolean
  uploadedFiles: Array<{ name: string; content: string; size: number; type: 'txt' | 'md' }>

  // 方法
  onSubmit: (e: React.FormEvent) => void
  onStop: () => void
  onModelChange: (model: string) => void
  onThinkingToggle: (enabled: boolean) => void
  onStartRecording: () => void
  onStopRecording: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
}

/**
 * 输入框 UI 组件
 * 
 * 纯展示组件，不包含任何业务逻辑
 */
export function ChatInputUI({
  input,
  setInput,
  selectedModel,
  enableThinking,
  isLoading,
  isRecording,
  isTranscribing,
  uploadedFiles,
  onSubmit,
  onStop,
  onModelChange,
  onThinkingToggle,
  onStartRecording,
  onStopRecording,
  onFileUpload,
  onRemoveFile,
}: ChatInputUIProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const currentModel = getModelById(selectedModel)
  const disabled = isLoading || isRecording || isTranscribing

  // 处理拖拽上传
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      // 模拟 input change 事件
      const input = fileInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(files[0])
        input.files = dataTransfer.files

        // 触发 change 事件
        const event = new Event('change', { bubbles: true })
        input.dispatchEvent(event)
      }
    }
  }, [])

  // 获取文件图标和颜色
  const getFileIcon = (type: 'txt' | 'md') => {
    if (type === 'md') {
      return <MarkdownIcon className="h-3.5 w-3.5 text-orange-500" />
    }
    return <TextFileIcon className="h-3.5 w-3.5 text-blue-500" />
  }
  
  // 判断是否可以发送
  // 注意：在 isLoading 时，按钮会被替换成停止按钮，所以这里不需要考虑 isLoading
  const canSend = input.trim() && !isRecording && !isTranscribing

  return (
    <div
      className={cn(
        "shrink-0 bg-background  transition-colors relative",
        isDragging && "bg-blue-50 dark:bg-blue-900/10"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽提示 */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 dark:bg-blue-900/20 backdrop-blur-sm z-10 pointer-events-none">
          <div className="text-center">
            <FileUp className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              拖放文件到这里上传
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
              支持 .txt 和 .md 文件
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6 py-4">
        {/* 统一的输入模块容器 */}
        <div className="bg-background rounded-3xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow">
          {/* 第一层：纯输入框 */}
          <form onSubmit={onSubmit} className="relative mb-2" id="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canSend) {
                  e.preventDefault()
                  const form = e.currentTarget.closest('form')
                  if (form) {
                    const event = new Event('submit', { bubbles: true, cancelable: true })
                    form.dispatchEvent(event)
                  }
                }
              }}
              placeholder={
                isRecording
                  ? '正在录音...'
                  : isTranscribing
                  ? '正在转录...'
                  : '有什么可以帮你？'
              }
              disabled={disabled}
              className="w-full h-12 bg-white dark:bg-gray-800 rounded-3xl px-5 text-[15px] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-secondary))] outline-none"
              autoComplete="off"
            />
          </form>
          
          {/* 已上传文件列表 */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    file.type === 'md'
                      ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                      : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  )}
                >
                  {getFileIcon(file.type)}
                  <span className={cn(
                    "max-w-[150px] truncate font-medium",
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
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className={cn(
                      "ml-1 hover:opacity-70 transition-opacity",
                      file.type === 'md'
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 第二层：Action工具栏 */}
          <div className="flex items-center justify-between px-2">
          {/* 左侧工具 */}
          <div className="flex items-center gap-1">
            {/* 附加文件按钮 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={onFileUpload}
              className="hidden"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="h-8 w-8 rounded-lg hover:bg-[hsl(var(--input-hover))]"
                  >
                    <FileUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>附加文件 (.txt, .md)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 思考模式按钮 */}
            {currentModel?.supportsThinkingToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onThinkingToggle(!enableThinking)}
                      className={cn(
                        'h-8 w-8 rounded-lg transition-all',
                        enableThinking
                          ? 'bg-[hsl(var(--accent-thinking))] hover:bg-[hsl(var(--accent-thinking))]/90 text-white'
                          : 'hover:bg-[hsl(var(--input-hover))] text-gray-600 dark:text-gray-400'
                      )}
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{enableThinking ? '关闭思考模式' : '开启思考模式'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* 右侧操作 */}
          <div className="flex items-center gap-1">
            {/* 录音按钮 */}
            {!isLoading && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={isTranscribing}
                className={cn(
                  'h-8 w-8 rounded-lg',
                  isRecording
                    ? 'bg-[hsl(var(--accent-red))]/10 text-[hsl(var(--accent-red))]'
                    : 'hover:bg-[hsl(var(--input-hover))]'
                )}
                aria-label={isRecording ? '停止录音' : '开始录音'}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {/* 发送/停止按钮 */}
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                onClick={onStop}
                className="h-8 w-8 rounded-full bg-[hsl(var(--button-primary-bg))] text-white hover:bg-[hsl(var(--button-primary-hover))]"
                aria-label="停止生成"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                disabled={!canSend}
                onClick={() => {
                  if (canSend) {
                    const form = document.getElementById('chat-input-form')
                    if (form) {
                      const event = new Event('submit', { bubbles: true, cancelable: true })
                      form.dispatchEvent(event)
                    }
                  }
                }}
                className={cn(
                  'h-8 w-8 rounded-full transition-colors',
                  canSend
                    ? 'bg-[hsl(var(--button-primary-bg))] text-white hover:bg-[hsl(var(--button-primary-hover))]'
                    : 'bg-[hsl(var(--text-tertiary))]/20 text-[hsl(var(--text-tertiary))] cursor-not-allowed'
                )}
                aria-label="发送消息"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
          </div>
        </div>
        
        {/* 免责声明 */}
        <p className="text-center text-xs text-[hsl(var(--text-secondary))] mt-3">
          Sky Chat 可能会出错。请核实重要信息。
        </p>
      </div>
    </div>
  )
}
