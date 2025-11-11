'use client'

/**
 * Message List Module - 虚拟滚动消息列表
 * 
 * 整合 TanStack Virtual + 消息渲染 + 无限滚动
 * 简单直接，无过度封装
 * 
 * @module modules/message-list
 */

import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useChatStore } from '@/lib/stores/chat.store'
import { ChatMessage } from '@/modules/chat-message'
import { Loader2 } from 'lucide-react'

export function MessageList() {
  // 从 Store 获取数据
  const messages = useChatStore((s) => s.messages)
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder)
  const hasOlderMessages = useChatStore((s) => s.hasOlderMessages)
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages)
  
  // 滚动容器
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
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
  
  // 新消息自动滚动到底部
  useEffect(() => {
    if (messages.length === 0) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    // 判断用户是否在底部附近（距离底部 < 200px）
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 200
    
    if (isNearBottom) {
      // 滚动到最后一条消息
      setTimeout(() => {
        virtualizer.scrollToIndex(messages.length - 1, {
          align: 'end',
          behavior: 'smooth',
        })
      }, 100)
    }
  }, [messages.length, virtualizer])
  
  // 空状态
  if (messages.length === 0) {
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
      className="flex-1 overflow-y-auto pb-40"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
        className="mx-auto max-w-3xl px-6"
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
