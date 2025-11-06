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
import { ArrowUp, Mic, Loader2, Brain, Square, Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getModelById } from '@/lib/constants/models'
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
  
  // 方法
  onSubmit: (e: React.FormEvent) => void
  onStop: () => void
  onThinkingToggle: (enabled: boolean) => void
  onStartRecording: () => void
  onStopRecording: () => void
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
  onSubmit,
  onStop,
  onThinkingToggle,
  onStartRecording,
  onStopRecording,
}: ChatInputUIProps) {
  const currentModel = getModelById(selectedModel)
  const disabled = isLoading || isRecording || isTranscribing
  
  // 判断是否可以发送
  const canSend = input.trim() && !disabled
  
  return (
    <div className="fixed bottom-0 left-64 right-0 bg-gradient-to-t from-background via-background to-background/95 h-40 pointer-events-none">
      <div className="mx-auto max-w-4xl px-6 h-full flex flex-col justify-center pb-4 pointer-events-auto">
        
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
                  : 'Ask anything'
              }
              disabled={disabled}
              className="w-full h-12 bg-white dark:bg-gray-800 rounded-3xl px-5 text-[15px] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-secondary))] outline-none"
              autoComplete="off"
            />
          </form>
          
          {/* 第二层：Action工具栏 */}
          <div className="flex items-center justify-between px-2">
          {/* 左侧工具 */}
          <div className="flex items-center gap-1">
            {/* 附加文件按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg hover:bg-[hsl(var(--input-hover))]"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>附加文件</p>
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
            
            {/* Tools按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg hover:bg-[hsl(var(--input-hover))] gap-1.5"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span className="text-sm">Tools</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>使用工具</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        <p className="text-center text-xs text-[hsl(var(--text-secondary))] mt-4 mb-2">
          Sky Chat 可能会出错。请核实重要信息。
        </p>
      </div>
    </div>
  )
}
