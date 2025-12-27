/**
 * 消息状态机类型定义
 * 
 * 定义消息级状态机的核心类型，用于统一管理 AI 消息的生命周期
 */

/** 消息阶段 */
export type MessagePhase = 
  | 'idle'          // 静止（已完成或未开始）
  | 'thinking'      // 思考中
  | 'tool_calling'  // 工具调用中
  | 'answering'     // 回答中
  | 'error'         // 错误

/** 工具状态 */
export type ToolState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/** 工具调用信息 */
export interface ActiveTool {
  toolCallId: string
  name: string
  state: ToolState
  args?: Record<string, unknown>
  progress?: number  // 0-100，用于长时间运行的工具
  estimatedTime?: number  // 预估剩余时间（秒）
  result?: {
    success: boolean
    data?: unknown
    cancelled?: boolean
  }
}

/** 消息运行时状态（不持久化） */
export interface MessageRuntimeState {
  phase: MessagePhase
  activeTools: Map<string, ActiveTool>
}

/** 状态转换事件 */
export type PhaseEvent = 
  | { type: 'START_THINKING' }
  | { type: 'START_TOOL_CALL'; toolCallId: string; name: string; args?: Record<string, unknown> }
  | { type: 'TOOL_PROGRESS'; toolCallId: string; progress: number; estimatedTime?: number }
  | { type: 'TOOL_COMPLETE'; toolCallId: string; success: boolean; result?: unknown; cancelled?: boolean }
  | { type: 'TOOL_CANCEL'; toolCallId: string }
  | { type: 'START_ANSWERING' }
  | { type: 'COMPLETE' }
  | { type: 'ERROR'; message: string }
