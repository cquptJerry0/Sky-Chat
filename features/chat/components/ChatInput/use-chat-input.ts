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
import { nanoid } from 'nanoid'
import { useChatStore } from '@/lib/stores/chat.store'
import { SSEParser } from '@/lib/services/sse-parser'
import { useToast } from '@/lib/hooks/use-toast'
import { useAudioRecorder } from '@/features/voice/hooks/use-audio-recorder'
import { ChatAPI } from '@/lib/services/chat-api'
import { ConversationAPI } from '@/lib/services/conversation-api'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'
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
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const selectedModel = useChatStore((s) => s.selectedModel)
  const enableThinking = useChatStore((s) => s.enableThinking)
  const addMessage = useChatStore((s) => s.addMessage)
  const appendThinking = useChatStore((s) => s.appendThinking)
  const appendContent = useChatStore((s) => s.appendContent)
  const startStreaming = useChatStore((s) => s.startStreaming)
  const stopStreaming = useChatStore((s) => s.stopStreaming)
  const setSendingMessage = useChatStore((s) => s.setSendingMessage)
  const updateMessage = useChatStore((s) => s.updateMessage)
  
  // 录音功能
  const {
    isRecording,
    audioBlob,
    startRecording: startRecordingRaw,
    stopRecording: stopRecordingRaw,
    clearAudio,
  } = useAudioRecorder()

  /**
   * 开始录音（带错误处理）
   */
  const startRecording = useCallback(async () => {
    try {
      await startRecordingRaw()
    } catch (error) {
      console.error('Failed to start recording:', error)

      // 检查错误类型并显示友好提示
      if (error instanceof Error) {
        if (error.name === 'NotFoundError' || error.message.includes('Requested device not found')) {
          toast({
            title: '未检测到麦克风',
            description: '请检查您的设备是否连接了麦克风，或者尝试刷新页面。',
            variant: 'destructive',
          })
        } else if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          toast({
            title: '麦克风权限被拒绝',
            description: '请在浏览器设置中允许访问麦克风。',
            variant: 'destructive',
          })
        } else if (error.name === 'NotSupportedError') {
          toast({
            title: '浏览器不支持录音',
            description: '请使用 Chrome、Edge 或 Safari 等现代浏览器。',
            variant: 'destructive',
          })
        } else {
          toast({
            title: '录音失败',
            description: error.message || '无法启动录音，请稍后重试。',
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: '录音失败',
          description: '无法启动录音，请稍后重试。',
          variant: 'destructive',
        })
      }
    }
  }, [startRecordingRaw, toast])
  
  /**
   * 发送消息（内部方法，可被handleSubmit和重试调用）
   * @param message - 消息内容
   * @param options - 可选参数
   * @param options.skipUserMessage - 是否跳过创建用户消息（重试时使用）
   * @param options.isRetry - 是否是重试操作
   * @param options.isEdit - 是否是编辑重发操作
   */
  const sendMessage = useCallback(
    async (
      message: string,
      options?: {
        skipUserMessage?: boolean
        isRetry?: boolean
        isEdit?: boolean
      }
    ) => {
      if (isSendingMessage || isRecording || isTranscribing) {
        return
      }

      const { skipUserMessage = false, isRetry = false, isEdit = false } = options || {}

      console.log('[ChatInput] sendMessage called with options:', { skipUserMessage, isRetry, isEdit })

      // 使用 nanoid 生成唯一 ID（前后端统一使用）
      const userMessageId = nanoid()
      const aiMessageId = nanoid()

      console.log('[ChatInput] Creating messages - user:', userMessageId, 'ai:', aiMessageId)

      // 只有在非重试模式下才添加用户消息
      if (!skipUserMessage) {
        const userMsg: Message = {
          id: userMessageId,
          role: 'user',
          content: message,
        }
        addMessage(userMsg)
        console.log('[ChatInput] User message added to store')
      }

      // 创建 AI 消息
      const aiMsg: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        thinking: '',
      }

      addMessage(aiMsg)
      console.log('[ChatInput] AI message added to store, ID:', aiMsg.id)
      setSendingMessage(true)
      
      // 创建 AbortController
      abortControllerRef.current = new AbortController()
      
      // 初始化actualMessageId为aiMsg.id，避免作用域问题
      let actualMessageId = aiMsg.id
      
      try {
        // 获取当前会话ID
        let currentConversationId = useChatStore.getState().currentConversationId
        
        // 如果没有会话，先创建一个
        if (!currentConversationId) {
          try {
            const { conversation } = await ConversationAPI.create()
            currentConversationId = conversation.id

            // 更新store
            useChatStore.getState().setConversationId(currentConversationId)

            // 更新URL（如果在 /chat 页面）
            if (window.location.pathname === '/chat') {
              window.history.replaceState(null, '', `/chat/${currentConversationId}`)
            }

            // 添加到会话列表
            if (conversation) {
              const state = useChatStore.getState()
              useChatStore.setState({
                conversations: [conversation, ...state.conversations],
                filteredConversations: [conversation, ...state.filteredConversations],
                currentConversationId: conversation.id,
              })
            }
          } catch (error) {
            console.error('[ChatInput] Failed to create conversation:', error)
            setSendingMessage(false)
            stopStreaming()
            toast({
              title: '创建会话失败',
              description: '请重试',
              variant: 'destructive',
            })
            return
          }
        }
        
        // 构建请求体
        const requestBody = {
          message,
          conversationId: currentConversationId,
          model: selectedModel,
          enableThinking,
          thinkingBudget: 4096,
          isRetry,
          isEdit,
          // 传递前端生成的消息 ID 给后端
          userMessageId: skipUserMessage ? undefined : userMessageId,
          aiMessageId: aiMessageId,
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
        
        // 从响应header获取conversationId、messageId和标题
        const conversationId = response.headers.get('X-Conversation-ID')
        const serverMessageId = response.headers.get('X-Message-ID')
        const conversationTitleEncoded = response.headers.get('X-Conversation-Title')
        const conversationTitle = conversationTitleEncoded ? decodeURIComponent(conversationTitleEncoded) : null
        
        if (conversationId && !currentConversationId) {
          // 如果是新创建的会话，保存到store
          useChatStore.getState().setConversationId(conversationId)
        }
        
        // 如果标题有更新，同步更新conversations列表
        if (conversationId && conversationTitle) {
          const state = useChatStore.getState()
          const existingConversation = state.conversations.find(c => c.id === conversationId)

          if (existingConversation && existingConversation.title !== conversationTitle) {
            useChatStore.setState({
              conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, title: conversationTitle } : c
              ),
              filteredConversations: state.filteredConversations.map(c =>
                c.id === conversationId ? { ...c, title: conversationTitle } : c
              ),
            })
          }
        }
        
        // 更新AI消息的ID为服务端返回的ID（用于续传）
        // 使用新ID进行后续操作
        actualMessageId = serverMessageId || aiMsg.id
        if (serverMessageId) {
          useChatStore.getState().updateMessage(aiMsg.id, {
            id: serverMessageId,
          })
        }
        
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No reader available')
        }
        
        // 使用 SSEParser 处理流
        SSEParser.parseStream(reader).subscribe({
          next: (data) => {
            console.log('[SSE] Received:', data.type, 'messageId:', actualMessageId)

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

              // 调试：检查消息是否更新
              const currentMessages = useChatStore.getState().messages
              const targetMessage = currentMessages.find(m => m.id === actualMessageId)
              console.log('[SSE] Message updated:', targetMessage?.content?.slice(0, 50))
            } else if (data.type === 'complete') {
              stopStreaming()
              setSendingMessage(false)
            }
          },
          error: (error) => {
            if (error.name !== 'AbortError') {
              console.error('Stream error:', error)
              updateMessage(actualMessageId, { hasError: true })
              stopStreaming()
              setSendingMessage(false)
              toast({
                title: '发送失败',
                description: '网络错误，请重试',
                variant: 'destructive',
              })
            }
          },
          complete: () => {
            stopStreaming()
            setSendingMessage(false)
          },
        })
      } catch (error) {
        console.error('Send message error:', error)
        stopStreaming()
        setSendingMessage(false)
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
      isSendingMessage,
      isRecording,
      isTranscribing,
      selectedModel,
      enableThinking,
      addMessage,
      appendThinking,
      appendContent,
      startStreaming,
      stopStreaming,
      setSendingMessage,
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
    // 传递原因给 abort，避免控制台警告
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(
        new DOMException('User stopped generation', 'AbortError')
      )
      abortControllerRef.current = null // 清理引用
    }

    // 传递中断原因
    stopStreaming('user_stop')
    setSendingMessage(false)
  }, [stopStreaming, setSendingMessage])
  
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

    // 验证音频文件大小（至少需要 1KB）
    const MIN_AUDIO_SIZE = 1024 // 1KB
    if (audioBlob.size < MIN_AUDIO_SIZE) {
      toast({
        title: '录音时间太短',
        description: '请至少录音 1 秒钟',
        variant: 'destructive',
      })
      clearAudio()
      return
    }

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
   * 从 localStorage 读取待发送消息并填充到输入框（仅一次）
   */
  useEffect(() => {
    const pendingMessage = StorageManager.get<string>(STORAGE_KEYS.USER.PENDING_MESSAGE)

    if (pendingMessage) {
      setInput(pendingMessage)

      // 清除 localStorage 中的待发送消息
      StorageManager.remove(STORAGE_KEYS.USER.PENDING_MESSAGE)
    }
  }, []) // 空依赖数组，仅在组件挂载时执行一次

  /**
   * 监听重试和编辑事件
   */
  useEffect(() => {
    const handleRetryMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{ content: string }>
      if (customEvent.detail?.content) {
        // 重试时：跳过创建用户消息（因为用户消息已存在）
        sendMessage(customEvent.detail.content, {
          skipUserMessage: true,
          isRetry: true,
        })
      }
    }

    const handleEditAndResend = (event: Event) => {
      const customEvent = event as CustomEvent<{ content: string }>
      if (customEvent.detail?.content) {
        // 编辑后重发：创建新的用户消息，但告诉后端这是编辑操作
        sendMessage(customEvent.detail.content, {
          skipUserMessage: false,
          isEdit: true,
        })
      }
    }

    window.addEventListener('retry-message', handleRetryMessage)
    window.addEventListener('edit-and-resend', handleEditAndResend)

    return () => {
      window.removeEventListener('retry-message', handleRetryMessage)
      window.removeEventListener('edit-and-resend', handleEditAndResend)
    }
  }, [sendMessage])
  
  /**
   * 监听标签页可见性变化
   * 当标签页隐藏时，暂停正在进行的请求
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 只在标签页隐藏且正在加载时才暂停
      if (document.hidden && isSendingMessage) {
        // 中止当前请求
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }

        // 标记为标签页切换导致的暂停
        stopStreaming('tab_hidden')
        setSendingMessage(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isSendingMessage, stopStreaming, setSendingMessage])
  
  return {
    // 状态
    input,
    setInput,
    isLoading: isSendingMessage,
    isRecording,
    isTranscribing,

    // 方法
    handleSubmit,
    handleStop,
    startRecording,
    stopRecording,
  }
}

