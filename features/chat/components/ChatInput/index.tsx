'use client'

/**
 * Chat Input Module - 输入模块
 * 
 * 接收 conversationId prop，传递给 useChatInput hook
 * 
 * @module modules/chat-input
 */

import { useChatStore } from '@/features/chat/store/chat.store'
import { useChatInput } from './use-chat-input'
import { ChatInputUI } from './ChatInputUI'

interface ChatInputProps {
  conversationId: string
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const selectedModel = useChatStore((s) => s.selectedModel)
  const enableThinking = useChatStore((s) => s.enableThinking)
  const enableWebSearch = useChatStore((s) => s.enableWebSearch)
  const setModel = useChatStore((s) => s.setModel)
  const toggleThinking = useChatStore((s) => s.toggleThinking)
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch)
  
  const {
    input,
    setInput,
    isSendingMessage,
    isRecording,
    isTranscribing,
    uploadedFiles,
    handleSubmit,
    handleStop,
    handleFileUpload,
    handleRemoveFile,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useChatInput({ conversationId })

  return (
    <ChatInputUI
      input={input}
      setInput={setInput}
      selectedModel={selectedModel}
      enableThinking={enableThinking}
      isLoading={isSendingMessage}
      isRecording={isRecording}
      isTranscribing={isTranscribing}
      uploadedFiles={uploadedFiles}
      onSubmit={handleSubmit}
      onStop={handleStop}
      _onModelChange={setModel}
      onThinkingToggle={toggleThinking}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onCancelRecording={cancelRecording}
      onFileUpload={handleFileUpload}
      onRemoveFile={handleRemoveFile}
    />
  )
}
