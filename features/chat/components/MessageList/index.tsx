'use client'

/**
 * Message List Module - 虚拟滚动消息列表
 *
 * 整合 TanStack Virtual + 消息渲染 + 无限滚动
 * 简单直接，无过度封装
 *
 * @module modules/message-list
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useChatStore } from '@/features/chat/store/chat.store'
import { ChatMessage } from '@/features/chat/components/ChatMessage'
import { ChatService } from '@/features/chat/services/chat.service'

export function MessageList() {
  const params = useParams()
  const searchParams = useSearchParams()
  const conversationId = params.conversationId as string
  
  // 从 Store 获取数据
  const messages = useChatStore((s) => s.messages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  
  // 获取流式消息的内容长度，用于触发滚动
  const streamingContentLength = useChatStore((s) => {
    if (!s.streamingMessageId) return 0
    const msg = s.messages.find(m => m.id === s.streamingMessageId)
    if (!msg) return 0
    return (msg.content?.length || 0) + (msg.thinking?.length || 0)
  })
  
  // 滚动容器
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 用户是否主动上滑
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const previousMessagesLength = useRef(0)
  const previousConversationId = useRef<string | null>(null)
  
  // 检查消息数组是否有重复 ID（调试用）
  useEffect(() => {
    const ids = messages.map(m => m.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      console.warn('[MessageList] Duplicate message IDs detected!', ids)
    }
  }, [messages])
  
  // TanStack Virtual 配置
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const msg = messages[index]
      if (!msg) return 100
      if (msg.thinking) return 250
      if (msg.content.includes('```')) return 300
      if (msg.role === 'user') return 80
      return 150
    },
    overscan: 3,
  })
  
  const virtualItems = virtualizer.getVirtualItems()
  
  // ========== 滚动到底部 ==========
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    container.scrollTop = container.scrollHeight
    
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [])
  
  // ========== 监听用户滚动 ==========
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setUserScrolledUp(distanceFromBottom > 100)
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  
  // 是否需要在加载完成后滚动
  const shouldScrollAfterLoad = useRef(false)
  // pending message 是否已发送
  const pendingMessageSentRef = useRef(false)
  
  // ========== 切换会话时重置状态 ==========
  useEffect(() => {
    if (!conversationId) return
    
    if (previousConversationId.current !== conversationId) {
      previousConversationId.current = conversationId
      previousMessagesLength.current = 0
      setUserScrolledUp(false)
      shouldScrollAfterLoad.current = true
      pendingMessageSentRef.current = false
    }
  }, [conversationId])
  
  // ========== 处理 URL 中的 pending message ==========
  useEffect(() => {
    console.log('[MessageList] pending check:', { 
      isLoadingMessages, 
      conversationId, 
      pendingMessageSent: pendingMessageSentRef.current,
      msg: searchParams.get('msg')
    })
    
    // 等待加载完成
    if (isLoadingMessages) return
    if (pendingMessageSentRef.current) return
    if (!conversationId) return
    
    const pendingMessage = searchParams.get('msg')
    if (!pendingMessage) return
    
    console.log('[MessageList] Sending pending message:', pendingMessage)
    pendingMessageSentRef.current = true
    
    // 清理 URL 参数
    const url = new URL(window.location.href)
    url.searchParams.delete('msg')
    window.history.replaceState({}, '', url.pathname)
    
    // 发送消息
    ChatService.sendMessage(conversationId, pendingMessage, { createUserMessage: true })
  }, [isLoadingMessages, conversationId, searchParams])
  
  // ========== 消息加载完成后滚动到底部 ==========
  useEffect(() => {
    if (shouldScrollAfterLoad.current && !isLoadingMessages && messages.length > 0) {
      shouldScrollAfterLoad.current = false
      // 延迟一下等虚拟列表渲染完
      setTimeout(() => {
        scrollToBottom()
      }, 50)
    }
  }, [isLoadingMessages, messages.length, scrollToBottom])
  
  // ========== 新消息时滚动 ==========
  useEffect(() => {
    if (messages.length === 0) return
    
    const isNewMessage = messages.length > previousMessagesLength.current
    previousMessagesLength.current = messages.length
    
    if (!isNewMessage) return
    
    if (isSendingMessage || !userScrolledUp) {
      if (isSendingMessage) {
        setUserScrolledUp(false)
      }
      scrollToBottom()
    }
  }, [messages.length, isSendingMessage, userScrolledUp, scrollToBottom])
  
  // ========== 流式更新时滚动 ==========
  useEffect(() => {
    if (!streamingMessageId || userScrolledUp) return
    scrollToBottom()
  }, [streamingContentLength, streamingMessageId, userScrolledUp, scrollToBottom])
  
  // 空状态
  if (messages.length === 0 && !isSendingMessage && !isLoadingMessages) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-[32px] font-normal text-[hsl(var(--text-primary))] mb-8">
            我能帮你什么？
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto custom-scrollbar-auto"
      style={{ overflowAnchor: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
        className="mx-auto max-w-3xl px-6 py-6"
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index]
          
          if (!message) {
            console.warn('[MessageList] Missing message at index:', virtualItem.index)
            return null
          }

          return (
            <div
              key={`${virtualItem.index}-${message.id}`}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ChatMessage messageId={message.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
