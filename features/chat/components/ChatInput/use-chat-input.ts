/**
 * 简化版的 ChatInput Hook
 * 所有消息发送逻辑都在 Store 中处理
 */

import { useCallback, useState, useEffect } from 'react'
import { useChatStore } from '@/features/chat/store/chat.store'
import { useAudioRecorder } from '@/features/voice/hooks/use-audio-recorder'
import { ChatAPI } from '@/lib/services/chat-api'
import { useToast } from '@/lib/hooks/use-toast'
import type { FileAttachment } from '@/features/chat/types/chat'

export function useChatInput() {
  const [input, setInput] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const { toast } = useToast()

  // 从 Store 获取状态和方法
  const isSendingMessage = useChatStore((state) => state.isSendingMessage)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const stopStreaming = useChatStore((state) => state.stopStreaming)

  // 语音录制
  const {
    isRecording,
    audioBlob,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    cancelRecording,
    clearAudio,
  } = useAudioRecorder()

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
      const attachments = uploadedFiles.length > 0 ? [...uploadedFiles] : undefined

      setInput('')
      setUploadedFiles([])

      // 调用 Store 的 sendMessage 方法，传递附件
      await sendMessage(content, { createUserMessage: true, attachments })
    },
    [input, isSendingMessage, sendMessage, uploadedFiles]
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

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const validTypes = ['text/plain', 'text/markdown']
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      return
    }

    // 验证文件大小（最大 1MB）
    const MAX_SIZE = 1024 * 1024
    if (file.size > MAX_SIZE) {
      return
    }

    // 添加文件到列表
    const fileType = file.name.endsWith('.md') ? 'md' : 'txt'

    setUploadedFiles(prev => [...prev, {
      name: file.name,
      type: fileType,
      size: file.size,
    }])

    // 重置 input
    e.target.value = ''
  }, [])

  /**
   * 移除文件
   */
  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * 开始录音
   */
  const handleStartRecording = useCallback(async () => {
    try {
      await startAudioRecording()
    } catch {
      toast({
        title: '无法访问麦克风',
        description: '请检查麦克风权限设置',
        variant: 'destructive',
      })
    }
  }, [startAudioRecording, toast])

  /**
   * 停止录音
   */
  const handleStopRecording = useCallback(() => {
    stopAudioRecording()
  }, [stopAudioRecording])

  /**
   * 取消录音
   */
  const handleCancelRecording = useCallback(() => {
    cancelRecording()
  }, [cancelRecording])

  /**
   * 当录音完成时，自动转文字
   */
  useEffect(() => {
    if (!audioBlob) return

    const transcribe = async () => {
      setIsTranscribing(true)
      try {
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        const result = await ChatAPI.speechToText(audioFile)

        if (result.text) {
          setInput(result.text)
        }

        clearAudio()
      } catch {
        toast({
          title: '语音识别失败',
          description: '请重试或手动输入',
          variant: 'destructive',
        })
      } finally {
        setIsTranscribing(false)
      }
    }

    transcribe()
  }, [audioBlob, clearAudio, toast])

  return {
    input,
    setInput: handleInputChange,
    handleSubmit,
    handleStop,
    isSendingMessage,
    uploadedFiles,
    handleFileUpload,
    handleRemoveFile,
    // 语音功能
    isRecording,
    isTranscribing,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    cancelRecording: handleCancelRecording,
  }
}

