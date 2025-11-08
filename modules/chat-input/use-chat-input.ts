/**
 * Chat Input Logic Hook - 输入逻辑钩子
 * 
 * 封装所有输入相关的副作用逻辑：
 * - 发送消息
 * - 流式传输处理
 * - 录音和转录
 * - 停止生成
 * 
 * @module modules/chat-input/use-chat-input
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useChatStore } from '@/lib/stores/chat.store'
import { SSEParser } from '@/lib/services/sse-parser'
import { useToast } from '@/hooks/use-toast'
import { useAudioRecorder } from '@/lib/hooks/use-audio-recorder'
import { ChatAPI } from '@/lib/services/chat-api'
import type { Message } from '@/lib/types/chat'

/**
 * 输入逻辑钩子
 * 
 * 返回所有输入相关的状态和方法
 */
export function useChatInput() {
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 从 store 获取状态和 actions
  const isLoading = useChatStore((s) => s.isLoading)
  const selectedModel = useChatStore((s) => s.selectedModel)
  const enableThinking = useChatStore((s) => s.enableThinking)
  const addMessage = useChatStore((s) => s.addMessage)
  const appendThinking = useChatStore((s) => s.appendThinking)
  const appendContent = useChatStore((s) => s.appendContent)
  const startStreaming = useChatStore((s) => s.startStreaming)
  const stopStreaming = useChatStore((s) => s.stopStreaming)
  const setLoading = useChatStore((s) => s.setLoading)
  const updateMessage = useChatStore((s) => s.updateMessage)
  
  // 录音功能
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording: stopRecordingRaw,
    clearAudio,
  } = useAudioRecorder()
  
  /**
   * 发送消息（内部方法，可被handleSubmit和重试调用）
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (isLoading || isRecording || isTranscribing) {
        return
      }
      
      // 创建用户消息（使用时间戳+随机数避免ID冲突）
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 9)
      const userMsg: Message = {
        id: `${timestamp}-user-${randomSuffix}`,
        role: 'user',
        content: message,
      }
      
      // 创建 AI 消息
      const aiMsg: Message = {
        id: `${timestamp}-ai-${randomSuffix}`,
        role: 'assistant',
        content: '',
        thinking: '',
      }
      
      addMessage(userMsg)
      addMessage(aiMsg)
      setLoading(true)
      
      // 创建 AbortController
      abortControllerRef.current = new AbortController()
      
      // 初始化actualMessageId为aiMsg.id，避免作用域问题
      let actualMessageId = aiMsg.id
      
      try {
        // 获取当前会话ID
        const currentConversationId = useChatStore.getState().currentConversationId
        
        // 构建请求体
        const requestBody = {
          message,
          conversationId: currentConversationId,
          model: selectedModel,
          enableThinking,
          thinkingBudget: 4096,
        }
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        })
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        // 从响应header获取conversationId和messageId
        const conversationId = response.headers.get('X-Conversation-ID')
        const serverMessageId = response.headers.get('X-Message-ID')
        
        if (conversationId && !currentConversationId) {
          // 如果是新创建的会话，保存到store
          useChatStore.getState().setConversationId(conversationId)
          // 重新加载会话列表
          useChatStore.getState().loadConversations()
        }
        
        // 更新AI消息的ID为服务端返回的ID（用于续传）
        // 使用新ID进行后续操作
        actualMessageId = serverMessageId || aiMsg.id
        if (serverMessageId) {
          useChatStore.getState().updateMessage(aiMsg.id, { id: serverMessageId })
        }
        
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No reader available')
        }
        
        // 使用 SSEParser 处理流
        SSEParser.parseStream(reader).subscribe({
          next: (data) => {
            if (data.type === 'thinking' && data.content) {
              // 开始 thinking 阶段
              if (useChatStore.getState().streamingPhase !== 'thinking') {
                startStreaming(actualMessageId, 'thinking')
              }
              appendThinking(actualMessageId, data.content)
            } else if (data.type === 'answer' && data.content) {
              // 开始 answer 阶段
              if (useChatStore.getState().streamingPhase !== 'answer') {
                startStreaming(actualMessageId, 'answer')
              }
              appendContent(actualMessageId, data.content)
            } else if (data.type === 'complete') {
              stopStreaming()
              setLoading(false)
            }
          },
          error: (error) => {
            if (error.name !== 'AbortError') {
              console.error('Stream error:', error)
              updateMessage(actualMessageId, { hasError: true })
              stopStreaming()
              setLoading(false)
              toast({
                title: '发送失败',
                description: '网络错误，请重试',
                variant: 'destructive',
              })
            }
          },
          complete: () => {
            stopStreaming()
            setLoading(false)
          },
        })
      } catch (error) {
        console.error('Send message error:', error)
        stopStreaming()
        setLoading(false)
        updateMessage(actualMessageId, { hasError: true })
        
        if (error instanceof Error && error.name !== 'AbortError') {
          toast({
            title: '发送失败',
            description: error.message,
            variant: 'destructive',
          })
        }
      }
    },
    [
      isLoading,
      isRecording,
      isTranscribing,
      selectedModel,
      enableThinking,
      addMessage,
      appendThinking,
      appendContent,
      startStreaming,
      stopStreaming,
      setLoading,
      updateMessage,
      toast,
    ]
  )
  
  /**
   * 提交消息（从表单）
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      
      if (!input.trim()) {
        return
      }
      
      const message = input.trim()
      setInput('')
      await sendMessage(message)
    },
    [input, sendMessage]
  )
  
  /**
   * 停止生成
   */
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    stopStreaming()
    setLoading(false)
  }, [stopStreaming, setLoading])
  
  /**
   * 停止录音并转录
   */
  const stopRecording = useCallback(async () => {
    stopRecordingRaw()
  }, [stopRecordingRaw])
  
  /**
   * 处理录音转录
   */
  useEffect(() => {
    if (!audioBlob || isRecording) return
    
    const transcribe = async () => {
      setIsTranscribing(true)
      
      try {
        const audioFile = new File([audioBlob], 'recording.webm', {
          type: audioBlob.type || 'audio/webm',
        })
        const result = await ChatAPI.speechToText(audioFile)
        setInput(result.text)
        clearAudio()
      } catch (error) {
        console.error('Transcription error:', error)
        toast({
          title: '转录失败',
          description: '语音识别失败，请重试',
          variant: 'destructive',
        })
      } finally {
        setIsTranscribing(false)
      }
    }
    
    transcribe()
  }, [audioBlob, isRecording, clearAudio, toast])
  
  /**
   * 监听重试和编辑事件
   */
  useEffect(() => {
    const handleRetryMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{ content: string }>
      if (customEvent.detail?.content) {
        sendMessage(customEvent.detail.content)
      }
    }
    
    const handleEditAndResend = (event: Event) => {
      const customEvent = event as CustomEvent<{ content: string }>
      if (customEvent.detail?.content) {
        sendMessage(customEvent.detail.content)
      }
    }
    
    window.addEventListener('retry-message', handleRetryMessage)
    window.addEventListener('edit-and-resend', handleEditAndResend)
    
    return () => {
      window.removeEventListener('retry-message', handleRetryMessage)
      window.removeEventListener('edit-and-resend', handleEditAndResend)
    }
  }, [sendMessage])
  
  return {
    // 状态
    input,
    setInput,
    isLoading,
    isRecording,
    isTranscribing,
    
    // 方法
    handleSubmit,
    handleStop,
    startRecording,
    stopRecording,
  }
}

