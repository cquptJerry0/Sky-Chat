'use client'

/**
 * Message List Module - 虚拟滚动消息列表
 * 
 * 整合 TanStack Virtual + 消息渲染 + 无限滚动
 * 简单直接，无过度封装
 * 
 * @module modules/message-list
 */

import * as React from 'react'
import { useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useChatStore } from '@/lib/stores/chat.store'
import { ChatMessage } from '@/modules/chat-message'
import { Loader2 } from 'lucide-react'

export function MessageList() {
  // 从 Store 获取数据
  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder)
  const hasOlderMessages = useChatStore((s) => s.hasOlderMessages)
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  
  // 滚动容器
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // 滚动状态管理
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const previousMessagesLength = useRef(messages.length)
  const scrollAnimationFrame = useRef<number>()
  
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
  
  // 监听用户滚动行为，智能判断是否需要自动滚动
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      
      // 如果距离底部 < 100px，启用自动滚动
      // 否则认为用户在浏览历史消息，禁用自动滚动
      setShouldAutoScroll(distanceFromBottom < 100)
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  
  // 监听滚动，触发加载历史消息
  useEffect(() => {
    const firstItem = virtualItems[0]
    
    // 距离顶部 < 5 条，且还有历史消息，且未在加载中
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
  
  // 智能自动滚动 - 新消息或流式更新时
  useEffect(() => {
    if (messages.length === 0) return
    if (!shouldAutoScroll) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    // 判断是否是新消息（消息数量增加）
    const isNewMessage = messages.length > previousMessagesLength.current
    previousMessagesLength.current = messages.length
    
    // 取消之前的滚动动画
    if (scrollAnimationFrame.current) {
      cancelAnimationFrame(scrollAnimationFrame.current)
    }
    
    // 使用requestAnimationFrame确保DOM更新后再滚动
    scrollAnimationFrame.current = requestAnimationFrame(() => {
      // 如果是流式更新（没有新消息但有streaming），使用平滑滚动
      // 如果是新消息，立即跳转到底部
      const behavior = isNewMessage ? 'auto' : 'smooth'
      
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior,
      })
    })
    
    return () => {
      if (scrollAnimationFrame.current) {
        cancelAnimationFrame(scrollAnimationFrame.current)
      }
    }
  }, [messages.length, shouldAutoScroll, virtualizer, streamingMessageId])
  
  // 空状态 - 只有在非加载状态且真的没有消息时才显示欢迎语
  if (messages.length === 0 && !isLoading) {
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
  
  // 加载状态且没有消息 - 显示loading（切换会话时）
  if (messages.length === 0 && isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-[hsl(var(--text-secondary))]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">加载消息中...</span>
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
