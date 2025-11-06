/**
 * 跨标签页同步类型定义
 * 
 * 本文件定义了多标签页之间同步聊天状态的数据结构
 * 使用 BroadcastChannel API 实现标签页间的实时通信
 * 
 * @module tab-sync/types
 */

/**
 * 同步事件类型
 * @description 定义可以在标签页间同步的事件类型
 * - MESSAGE_ADD: 新增消息（用户或 AI）
 * - MESSAGE_STREAM: 流式更新消息内容
 * - LOADING_STATE: 更新加载状态
 */
export type SyncEventType =
  | 'MESSAGE_ADD'
  | 'MESSAGE_STREAM'
  | 'LOADING_STATE'

/**
 * 消息同步载荷
 * @description 用于同步新增消息到其他标签页
 */
export interface MessageSyncPayload {
  /** 消息 ID */
  id: string
  /** 消息角色 */
  role: 'user' | 'assistant' | 'system'
  /** 消息内容 */
  content: string
  /** 思考过程 */
  thinking?: string
  /** 是否有错误 */
  hasError?: boolean
  /** 会话 ID */
  sessionId?: string
  /** 是否正在流式传输 */
  isStreaming?: boolean
}

/**
 * 流式内容同步载荷
 * @description 用于实时同步 AI 回复的流式内容
 */
export interface StreamSyncPayload {
  /** 要更新的消息 ID */
  messageId: string
  /** 更新后的完整内容 */
  content: string
  /** 会话 ID */
  sessionId?: string
}

/**
 * 加载状态同步载荷
 * @description 用于同步全局加载状态
 */
export interface LoadingStateSyncPayload {
  /** 是否正在加载 */
  isLoading: boolean
}

/**
 * 同步载荷联合类型
 * @description 所有可能的同步数据类型
 */
export type SyncPayload =
  | MessageSyncPayload
  | StreamSyncPayload
  | LoadingStateSyncPayload

/**
 * 同步事件映射
 * @description 将事件类型映射到对应的载荷类型
 * @remarks 用于类型安全的事件处理
 */
export interface SyncEventMap {
  MESSAGE_ADD: MessageSyncPayload
  MESSAGE_STREAM: StreamSyncPayload
  LOADING_STATE: LoadingStateSyncPayload
}

/**
 * 同步消息结构
 * @description BroadcastChannel 传输的完整消息结构
 * @template T - 事件类型，默认为所有事件类型
 */
export interface SyncMessage<T extends SyncEventType = SyncEventType> {
  /** 事件类型 */
  type: T
  /** 事件载荷，类型根据 type 自动推断 */
  payload: SyncEventMap[T]
  /** 消息时间戳 */
  timestamp: number
  /** 发送标签页的 ID */
  tabId: string
}
