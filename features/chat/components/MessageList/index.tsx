'use client'

/**
 * Message List Module - 虚拟滚动消息列表
 * 
 * 整合 TanStack Virtual + 消息渲染 + 无限滚动
 * 简单直接，无过度封装
 * 
 * @module modules/message-list
 */

import { useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useChatStore } from '@/features/chat/store/chat.store'
import { useConversationStore } from '@/features/conversation'
import { ChatMessage } from '@/features/chat/components/ChatMessage'
import { Loader2 } from 'lucide-react'

export function MessageList() {
  // 从 Store 获取数据
  const messages = useChatStore((s) => s.messages)
  const isSendingMessage = useChatStore((s) => s.isSendingMessage)
  const isSwitchingConversation = useConversationStore((s) => s.isSwitchingConversation)
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder)
  const hasOlderMessages = useChatStore((s) => s.hasOlderMessages)
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  
  // 滚动容器
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 滚动状态管理 - 简化！
  const [userScrolledUp, setUserScrolledUp] = useState<boolean>(false)
  const previousMessagesLength = useRef<number>(0)
  
  // TanStack Virtual 配置
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const msg = messages[index]
      // 智能估算高度
      if (!msg) return 100
      if (msg.thinking) return 250  // 有thinking的消息更高
      if (msg.content.includes('```')) return 300  // 代码块
      if (msg.role === 'user') return 80   // 用户消息较短
      return 150  // 默认 AI 回复
    },
    overscan: 3,  // 上下各渲染3条缓冲
  })
  
  const virtualItems = virtualizer.getVirtualItems()
  
  // ========== 滚动管理 - 彻底重构 ==========
  
  // 1. 监听用户滚动：检测是否上滑查看历史
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      
      // 距离底部 < 50px 认为在底部，否则认为上滑了
      setUserScrolledUp(distanceFromBottom > 50)
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  
  // 2. 监听滚动：触发加载历史消息
  useEffect(() => {
    const firstItem = virtualItems[0]
    
    if (
      firstItem && 
      firstItem.index < 5 && 
      hasOlderMessages && 
      !isLoadingOlder &&
      messages.length > 0
    ) {
      loadOlderMessages()
    }
  }, [virtualItems, hasOlderMessages, isLoadingOlder, messages.length, loadOlderMessages])
  
  // 3. 核心滚动逻辑 - 发送消息时强制滚动到底部
  useEffect(() => {
    if (messages.length === 0) return

    const container = scrollContainerRef.current
    if (!container) return

    // 判断场景
    const isNewMessage = messages.length > previousMessagesLength.current
    const isStreamingUpdate = streamingMessageId && !isNewMessage

    // 更新计数
    previousMessagesLength.current = messages.length

    // 决定是否滚动
    let shouldScroll = false

    if (isNewMessage) {
      // 新消息：如果是发送消息（isSendingMessage），强制滚动；否则只在底部时滚动
      shouldScroll = isSendingMessage || !userScrolledUp

      // 如果是发送消息，重置 userScrolledUp 状态
      if (isSendingMessage) {
        setUserScrolledUp(false)
      }
    } else if (isStreamingUpdate) {
      // 流式更新：只有在底部时才滚动
      shouldScroll = !userScrolledUp
    }

    if (!shouldScroll) return

    // 执行滚动 - 使用多重延迟确保DOM完成
    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight

      // 再延迟一次，处理异步渲染的情况
      setTimeout(() => {
        container.scrollTop = container.scrollHeight
      }, 50)
    }

    // 立即滚动一次
    scrollToBottom()

    // RAF再滚动一次（处理虚拟列表延迟渲染）
    requestAnimationFrame(() => {
      scrollToBottom()
    })
  }, [messages.length, streamingMessageId, userScrolledUp, isSendingMessage])
  
  // 空状态 - 只有在非加载状态且真的没有消息时才显示欢迎语
  // 不管是发送消息还是切换会话，都不应该显示欢迎语
  if (messages.length === 0 && !isSendingMessage && !isSwitchingConversation) {
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
      className="flex-1 overflow-y-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
        className="mx-auto max-w-3xl px-6 py-6"
      >
        {/* 加载历史消息指示器 */}
        {isLoadingOlder && (
          <div className="absolute top-0 left-0 right-0 py-4 flex justify-center">
            <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">加载历史消息...</span>
            </div>
          </div>
        )}

        {/* 虚拟列表渲染 */}
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index]

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}  // 自动测量高度
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
