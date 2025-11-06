'use client'

/**
 * 跨标签页聊天同步 Hook
 * 
 * 本 Hook 实现了多标签页之间的聊天状态同步功能，核心特性：
 * 
 * 1. **Leader 选举机制**：使用 Web Locks API 选举主标签页
 *    - 只有 Leader 标签页负责实际的 API 调用
 *    - Follower 标签页通过 BroadcastChannel 接收同步数据
 * 
 * 2. **消息同步**：
 *    - 新消息添加（MESSAGE_ADD）
 *    - 流式内容更新（MESSAGE_STREAM）
 *    - 加载状态同步（LOADING_STATE）
 * 
 * 3. **中断支持**：使用 AbortController 支持请求中断
 * 
 * @example
 * ```tsx
 * function ChatPage() {
 *   const { messages, isLoading, sendMessage, abort } = useTabSync()
 *   
 *   return (
 *     <>
 *       {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *       <button onClick={() => sendMessage('Hello')}>发送</button>
 *       {isLoading && <button onClick={abort}>停止</button>}
 *     </>
 *   )
 * }
 * ```
 * 
 * @module hooks/use-tab-sync
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message } from '@/lib/types/chat'
import { ChatAPI } from '@/lib/services/chat-api'
import { MessageProcessor } from '@/lib/processors/message-processor'
import { TabSyncManager, LeaderElection } from '@/lib/tab-sync'

/**
 * 跨标签页聊天同步 Hook
 * 
 * @returns {Object} Hook 返回值
 * @returns {Message[]} messages - 消息列表
 * @returns {boolean} isLoading - 是否正在加载
 * @returns {boolean} isLeader - 当前标签页是否为 Leader
 * @returns {Function} sendMessage - 发送消息函数
 * @returns {Function} abort - 中断当前请求
 * @returns {Function} retryMessage - 重试失败的消息
 * @returns {Function} clearMessages - 清空所有消息
 */
export function useTabSync() {
  // ==================== 状态管理 ====================
  /** 消息列表 */
  const [messages, setMessages] = useState<Message[]>([])
  /** 加载状态 */
  const [isLoading, setIsLoading] = useState(false)
  /** 是否为主标签页 */
  const [isLeader, setIsLeader] = useState(false)
  
  // ==================== Ref 管理 ====================
  /** 中断控制器，用于取消进行中的请求 */
  const abortControllerRef = useRef<AbortController | null>(null)
  /** 标签页同步管理器 */
  const tabSyncRef = useRef<TabSyncManager | null>(null)
  /** Leader 选举管理器 */
  const leaderElectionRef = useRef<LeaderElection | null>(null)

  // ==================== 初始化跨标签页同步 ====================
  useEffect(() => {
    // 创建同步管理器实例
    tabSyncRef.current = new TabSyncManager()
    leaderElectionRef.current = new LeaderElection()

    // 请求成为 Leader（基于 Web Locks API）
    leaderElectionRef.current.requestLeadership((leader) => {
      setIsLeader(leader)
    })

    // 监听其他标签页添加新消息
    tabSyncRef.current.on('MESSAGE_ADD', (payload) => {
      setMessages((prev) => {
        // 防止重复添加
        if (prev.find((m) => m.id === payload.id)) {
          return prev
        }
        return [...prev, payload as Message]
      })
    })

    // 监听流式消息内容更新
    tabSyncRef.current.on('MESSAGE_STREAM', (payload) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === payload.messageId
            ? {
                ...msg,
                content: payload.content,
                sessionId: payload.sessionId || msg.sessionId,
              }
            : msg
        )
      )
    })

    // 监听加载状态变化
    tabSyncRef.current.on('LOADING_STATE', (payload) => {
      setIsLoading(payload.isLoading)
    })

    // 清理函数：关闭连接并释放 Leader 锁
    return () => {
      tabSyncRef.current?.close()
      leaderElectionRef.current?.release()
    }
  }, [])

  /**
   * 发送消息
   * 
   * @description 
   * 发送用户消息并接收 AI 回复。工作流程：
   * 1. 创建用户消息和空的 AI 消息
   * 2. 广播到所有标签页（所有标签页都显示这两条消息）
   * 3. 如果是 Leader，调用 API 并处理流式响应
   * 4. 实时广播流式内容到其他标签页
   * 
   * @param {string} content - 用户输入的消息内容
   * 
   * @example
   * ```tsx
   * const { sendMessage, isLoading } = useTabSync()
   * 
   * <button 
   *   onClick={() => sendMessage('你好')}
   *   disabled={isLoading}
   * >
   *   发送
   * </button>
   * ```
   */
  const sendMessage = useCallback(
    async (content: string) => {
      // 防止重复请求
      if (isLoading) return

      // 创建中断控制器
      abortControllerRef.current = new AbortController()

      // 创建消息对象
      const userMsg = MessageProcessor.createUserMessage(content)
      const aiMsg = MessageProcessor.createAIMessage()

      // 本地添加消息
      setMessages((prev) => [...prev, userMsg, aiMsg])
      // 广播到其他标签页
      tabSyncRef.current?.broadcast('MESSAGE_ADD', userMsg)
      tabSyncRef.current?.broadcast('MESSAGE_ADD', aiMsg)

      // 更新加载状态
      setIsLoading(true)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: true })

      // 非 Leader 标签页不执行实际的 API 调用
      if (!isLeader) {
        return
      }

      try {
        // 调用聊天 API
        const response = await ChatAPI.sendMessage(
          content,
          undefined,
          undefined,
          abortControllerRef.current.signal
        )

        // 获取会话 ID（用于断点续传）
        const sessionId = response.headers.get('X-Session-ID')
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No reader')

        // 保存 sessionId 到消息
        if (sessionId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsg.id ? { ...m, sessionId } : m))
          )
        }

        // 处理流式响应
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // 解码 chunk
          const chunk = decoder.decode(value, { stream: true })
          const sseDataList = MessageProcessor.parseSSE(chunk)

          // 处理每个 SSE 事件
          for (const sseData of sseDataList) {
            setMessages((prev) => {
              const updated = MessageProcessor.updateMessage(
                prev,
                aiMsg.id,
                sseData
              )
              // 广播更新到其他标签页
              const currentMsg = updated.find((m) => m.id === aiMsg.id)
              if (currentMsg) {
                tabSyncRef.current?.broadcast('MESSAGE_STREAM', {
                  messageId: aiMsg.id,
                  content: currentMsg.content,
                  sessionId: currentMsg.sessionId,
                })
              }
              return updated
            })
          }
        }

        // 标记流式传输完成
        setMessages((prev) => MessageProcessor.markStreamComplete(prev, aiMsg.id))
        setIsLoading(false)
        tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
      } catch (error) {
        // 处理中断错误
        if (error instanceof Error && error.name === 'AbortError') {
          setMessages((prev) => MessageProcessor.markStreamComplete(prev, aiMsg.id))
        } else {
          // 其他错误标记为失败
          setMessages((prev) => MessageProcessor.markMessageError(prev, aiMsg.id))
        }
        setIsLoading(false)
        tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
      } finally {
        abortControllerRef.current = null
      }
    },
    [isLoading, isLeader]
  )

  /**
   * 中断当前请求
   * 
   * @description 
   * 取消正在进行的 AI 回复生成。
   * 会同步到所有标签页。
   * 
   * @example
   * ```tsx
   * {isLoading && (
   *   <button onClick={abort}>停止生成</button>
   * )}
   * ```
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      tabSyncRef.current?.broadcast('LOADING_STATE', { isLoading: false })
    }
  }, [])

  /**
   * 重试失败的消息
   * 
   * @description 
   * 找到失败消息对应的用户消息，删除失败的 AI 消息，
   * 然后重新发送用户消息。
   * 
   * @param {Message} message - 需要重试的 AI 消息
   * 
   * @example
   * ```tsx
   * {message.hasError && (
   *   <button onClick={() => retryMessage(message)}>
   *     重试
   *   </button>
   * )}
   * ```
   */
  const retryMessage = useCallback(
    (message: Message) => {
      // 找到消息在列表中的位置
      const messageIndex = messages.findIndex((m) => m.id === message.id)
      if (messageIndex === -1) return

      // 向前查找对应的用户消息
      let userMsg: Message | undefined
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userMsg = messages[i]
          break
        }
      }

      // 删除失败的消息并重新发送
      if (userMsg) {
        setMessages((prev) => prev.filter((m) => m.id !== message.id))
        sendMessage(userMsg.content)
      }
    },
    [messages, sendMessage]
  )

  /**
   * 清空所有消息
   * 
   * @description 
   * 先中断当前请求，然后清空消息列表。
   * 
   * @example
   * ```tsx
   * <button onClick={clearMessages}>
   *   清空对话
   * </button>
   * ```
   */
  const clearMessages = useCallback(() => {
    abort()
    setMessages([])
  }, [abort])

  // ==================== 清理副作用 ====================
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    isLeader,
    sendMessage,
    abort,
    retryMessage,
    clearMessages,
  }
}
