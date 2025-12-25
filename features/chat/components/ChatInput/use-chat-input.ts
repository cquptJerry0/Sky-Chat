/**
 * ChatInput Hook
 * 处理输入逻辑，接收 conversationId 参数
 */

import { useCallback, useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ChatService } from '@/features/chat/services/chat.service'
import { useAudioRecorder } from '@/features/voice/hooks/use-audio-recorder'
import { VoiceAPI } from '@/features/voice/services/voice-api'
import { useToast } from '@/lib/hooks/use-toast'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'
import type { FileAttachment } from '@/features/chat/types/chat'
import type { ImageConfig } from '../ImageGenerationModal'

interface UseChatInputOptions {
  conversationId: string
}

export function useChatInput({ conversationId }: UseChatInputOptions) {
  const [input, setInput] = useState('')
  const pendingMessageSentRef = useRef(false)
  const autoSendRef = useRef(false)
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const { toast } = useToast()

  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const stopStreaming = useChatStore((s) => s.stopStreaming)

  const {
    isRecording,
    audioBlob,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    cancelRecording,
    clearAudio,
  } = useAudioRecorder()

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!input.trim() || isSendingMessage) return

      const content = input.trim()
      const attachments = uploadedFiles.length > 0 ? [...uploadedFiles] : undefined

      setInput('')
      setUploadedFiles([])

      await ChatService.sendMessage(conversationId, content, { createUserMessage: true, attachments })
    },
    [input, isSendingMessage, uploadedFiles, conversationId]
  )

  const handleStop = useCallback(() => {
    ChatService.abortStream()
    stopStreaming('user_stop')
  }, [stopStreaming])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const fileData = await response.json()
      setUploadedFiles(prev => [...prev, fileData])

      toast({
        title: '文件已添加',
        description: `${fileData.name} (${(fileData.size / 1024).toFixed(1)} KB)`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '无法上传文件',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

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

  const handleStopRecording = useCallback(() => {
    stopAudioRecording()
  }, [stopAudioRecording])

  const handleCancelRecording = useCallback(() => {
    cancelRecording()
  }, [cancelRecording])

  // 处理登录后的 pending message
  // 填充到输入框并标记自动发送
  useEffect(() => {
    if (pendingMessageSentRef.current) return
    if (!conversationId) return
    
    const pendingMessage = StorageManager.get<string>(STORAGE_KEYS.USER.PENDING_MESSAGE)
    if (!pendingMessage) return

    pendingMessageSentRef.current = true
    StorageManager.remove(STORAGE_KEYS.USER.PENDING_MESSAGE)
    
    // 填充到输入框并标记需要自动发送
    setInput(pendingMessage)
    autoSendRef.current = true
  }, [conversationId])

  // 自动发送：当 input 被填充且标记了自动发送时触发
  useEffect(() => {
    if (!autoSendRef.current) return
    if (!input.trim() || isSendingMessage) return
    
    autoSendRef.current = false
    
    const content = input.trim()
    setInput('')
    ChatService.sendMessage(conversationId, content, { createUserMessage: true })
  }, [input, isSendingMessage, conversationId])

  useEffect(() => {
    if (!audioBlob) return

    const transcribe = async () => {
      setIsTranscribing(true)
      try {
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        const result = await VoiceAPI.speechToText(audioFile)

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

  // 处理图片生成（通过 Modal 配置）
  const handleImageGenerate = useCallback(
    async (config: ImageConfig) => {
      if (isSendingMessage) return

      // 构建带配置的生图请求消息
      // 把配置信息附加到消息中，让 AI 知道用户的具体需求
      let content = `请生成图片：${config.prompt}`
      if (config.negative_prompt) {
        content += `\n排除内容：${config.negative_prompt}`
      }
      if (config.image_size && config.image_size !== '1024x1024') {
        content += `\n图片尺寸：${config.image_size}`
      }
      
      await ChatService.sendMessage(conversationId, content, {
        createUserMessage: true,
      })
    },
    [isSendingMessage, conversationId]
  )

  return {
    input,
    setInput: handleInputChange,
    handleSubmit,
    handleStop,
    isSendingMessage,
    uploadedFiles,
    handleFileUpload,
    handleRemoveFile,
    isRecording,
    isTranscribing,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    cancelRecording: handleCancelRecording,
    handleImageGenerate,
  }
}
