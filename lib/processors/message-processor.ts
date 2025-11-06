/**
 * 消息处理器
 * 
 * 提供消息相关的工具方法，包括：
 * - SSE 流解析
 * - 消息创建和更新
 * - 状态标记
 * 
 * 所有方法都是纯函数，不修改原始数据。
 * 
 * @module processors/message-processor
 */

import type { SSEData, Message } from '@/lib/types/chat'

export class MessageProcessor {
  /**
   * 解析 SSE 数据流
   * 
   * @description 
   * 从 SSE chunk 中提取并解析 JSON 数据。
   * 自动过滤掉无效数据和 [DONE] 标记。
   * 
   * @param {string} chunk - 原始 SSE 数据块
   * @returns {SSEData[]} 解析后的 SSE 事件数组
   * 
   * @example
   * ```ts
   * const chunk = `
   * data: {"type": "answer", "content": "你好"}
   * data: {"type": "answer", "content": "世界"}
   * data: [DONE]
   * `
   * const events = MessageProcessor.parseSSE(chunk)
   * // events = [
   * //   { type: 'answer', content: '你好' },
   * //   { type: 'answer', content: '世界' }
   * // ]
   * ```
   */
  static parseSSE(chunk: string): SSEData[] {
    return chunk
      .split('\n')
      .filter((line) => line.trim().startsWith('data: '))
      .map((line) => {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return null
        try {
          return JSON.parse(data) as SSEData
        } catch {
          return null
        }
      })
      .filter((d): d is SSEData => d !== null)
  }

  /**
   * 更新消息内容
   * 
   * @description 
   * 根据 SSE 事件更新指定消息的内容。
   * 不会修改原数组，返回新数组。
   * 
   * 支持三种更新类型：
   * - thinking: 追加思考内容
   * - answer: 追加回答内容
   * - tool_calls: 设置工具调用
   * 
   * @param {Message[]} messages - 消息列表
   * @param {string} messageId - 要更新的消息 ID
   * @param {SSEData} sseData - SSE 事件数据
   * @returns {Message[]} 更新后的消息列表
   * 
   * @example
   * ```ts
   * const messages = [{ id: 'ai-1', content: 'Hello' }]
   * const updated = MessageProcessor.updateMessage(
   *   messages,
   *   'ai-1',
   *   { type: 'answer', content: ' World' }
   * )
   * // updated[0].content === 'Hello World'
   * ```
   */
  static updateMessage(
    messages: Message[],
    messageId: string,
    sseData: SSEData
  ): Message[] {
    return messages.map((msg) => {
      if (msg.id !== messageId) return msg

      const updates: Partial<Message> = {}

      // 根据事件类型更新不同字段
      switch (sseData.type) {
        case 'thinking':
          // 追加思考内容
          updates.thinking = (msg.thinking || '') + (sseData.content || '')
          break
        case 'answer':
          // 追加回答内容
          updates.content = msg.content + (sseData.content || '')
          break
        case 'tool_calls':
          // 设置工具调用
          updates.toolCalls = sseData.tool_calls
          break
      }

      return { ...msg, ...updates }
    })
  }

  /**
   * 创建用户消息
   * 
   * @description 
   * 创建一条新的用户消息，自动生成 ID。
   * 
   * @param {string} content - 消息内容
   * @returns {Message} 用户消息对象
   * 
   * @example
   * ```ts
   * const msg = MessageProcessor.createUserMessage('你好')
   * // { id: 'user-1234567890', role: 'user', content: '你好' }
   * ```
   */
  static createUserMessage(content: string): Message {
    return {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }
  }

  /**
   * 创建 AI 消息
   * 
   * @description 
   * 创建一条空的 AI 消息，用于接收流式内容。
   * 初始状态为 isStreaming = true。
   * 
   * @param {boolean} [withThinking=false] - 是否启用思考模式
   * @returns {Message} AI 消息对象
   * 
   * @example
   * ```ts
   * const msg = MessageProcessor.createAIMessage(true)
   * // {
   * //   id: 'ai-1234567890',
   * //   role: 'assistant',
   * //   content: '',
   * //   thinking: '',
   * //   isStreaming: true
   * // }
   * ```
   */
  static createAIMessage(withThinking = false): Message {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: '',
      thinking: withThinking ? '' : undefined,
      isStreaming: true,
    }
  }

  /**
   * 标记流式传输完成
   * 
   * @description 
   * 将消息的 isStreaming 状态设为 false。
   * 
   * @param {Message[]} messages - 消息列表
   * @param {string} messageId - 消息 ID
   * @returns {Message[]} 更新后的消息列表
   * 
   * @example
   * ```ts
   * const completed = MessageProcessor.markStreamComplete(messages, 'ai-1')
   * ```
   */
  static markStreamComplete(messages: Message[], messageId: string): Message[] {
    return messages.map((msg) =>
      msg.id === messageId ? { ...msg, isStreaming: false } : msg
    )
  }

  /**
   * 标记消息错误
   * 
   * @description 
   * 标记消息发生错误，设置默认错误文本。
   * 同时停止流式传输状态。
   * 
   * @param {Message[]} messages - 消息列表
   * @param {string} messageId - 消息 ID
   * @returns {Message[]} 更新后的消息列表
   * 
   * @example
   * ```ts
   * const errored = MessageProcessor.markMessageError(messages, 'ai-1')
   * ```
   */
  static markMessageError(messages: Message[], messageId: string): Message[] {
    return messages.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content: msg.content || '抱歉，发生了错误。',
            hasError: true,
            isStreaming: false,
          }
        : msg
    )
  }
}


