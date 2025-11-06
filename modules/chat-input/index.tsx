'use client'

/**
 * Chat Input Module - 输入模块
 * 
 * Container Component（容器组件）
 * 连接 Store 和 Logic Hook，零 props 设计
 * 
 * 架构：
 * - useChatStore: 获取全局状态
 * - use-chat-input: 封装输入逻辑
 * - ChatInputUI: 纯 UI 组件
 * 
 * @module modules/chat-input
 */

import { useChatStore } from '@/lib/stores/chat.store'
import { useChatInput } from './use-chat-input'
import { ChatInputUI } from './ChatInputUI'

/**
 * 输入模块容器组件
 * 
 * 零 props 设计，所有数据从 store 获取
 * 所有逻辑在 use-chat-input 中封装
 */
export function ChatInput() {
  // 从 store 获取配置状态
  const selectedModel = useChatStore((s) => s.selectedModel)
  const enableThinking = useChatStore((s) => s.enableThinking)
  const setModel = useChatStore((s) => s.setModel)
  const toggleThinking = useChatStore((s) => s.toggleThinking)
  
  // 使用自定义 hook 处理所有输入逻辑
  const {
    input,
    setInput,
    isLoading,
    isRecording,
    isTranscribing,
    handleSubmit,
    handleStop,
    startRecording,
    stopRecording,
  } = useChatInput()
  
  // 将所有状态和方法传递给 UI 组件
  return (
    <ChatInputUI
      input={input}
      setInput={setInput}
      selectedModel={selectedModel}
      enableThinking={enableThinking}
      isLoading={isLoading}
      isRecording={isRecording}
      isTranscribing={isTranscribing}
      onSubmit={handleSubmit}
      onStop={handleStop}
      onModelChange={setModel}
      onThinkingToggle={toggleThinking}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
    />
  )
}

