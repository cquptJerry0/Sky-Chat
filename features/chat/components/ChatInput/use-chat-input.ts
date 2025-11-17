/**
 * 简化版的 ChatInput Hook
 * 所有消息发送逻辑都在 Store 中处理
 */

import { useCallback, useState } from 'react'
import { useChatStore } from '@/features/chat/store/chat.store'

export function useChatInput() {
  const [input, setInput] = useState('')

  // 从 Store 获取状态和方法
  const isSendingMessage = useChatStore((state) => state.isSendingMessage)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const stopStreaming = useChatStore((state) => state.stopStreaming)

  /**
   * 提交消息
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!input.trim() || isSendingMessage) {
        return
      }

      const content = input.trim()
      setInput('')

      // 调用 Store 的 sendMessage 方法
      await sendMessage(content, { createUserMessage: true })
    },
    [input, isSendingMessage, sendMessage]
  )

  /**
   * 停止生成
   */
  const handleStop = useCallback(() => {
    stopStreaming('user_stop')
  }, [stopStreaming])

  /**
   * 处理输入变化
   */
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  return {
    input,
    setInput: handleInputChange,
    handleSubmit,
    handleStop,
    isSendingMessage,
    // 语音功能暂时禁用
    isRecording: false,
    isTranscribing: false,
    startRecording: async () => {},
    stopRecording: () => {},
  }
}

