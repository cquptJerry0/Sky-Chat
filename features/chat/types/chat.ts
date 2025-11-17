/**
 * Sky Chat 核心类型定义
 * 
 * 本文件定义了聊天系统的核心数据结构，包括：
 * - 消息类型和角色定义
 * - 流式传输（SSE）相关类型
 * - 工具调用和函数定义
 * - 聊天配置和状态管理
 */

/**
 * 消息角色类型
 * @description 定义聊天系统中的三种角色
 * - user: 用户消息
 * - assistant: AI 助手消息
 * - system: 系统提示消息
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * SSE（Server-Sent Events）事件类型
 * @description 定义服务器推送的事件类型
 * - thinking: AI 思考过程（用于 CoT 模型）
 * - answer: AI 回答内容
 * - tool_calls: 工具调用请求
 * - complete: 流式传输完成
 */
export type SSEEventType = 'thinking' | 'answer' | 'tool_calls' | 'complete'

/**
 * 工具调用结构
 * @description 当 AI 需要调用外部工具时的数据结构
 * @example
 * {
 *   id: "call_123",
 *   type: "function",
 *   function: {
 *     name: "get_weather",
 *     arguments: '{"city": "Beijing"}'
 *   }
 * }
 */
export interface ToolCall {
  /** 工具调用的唯一标识 */
  id: string
  /** 调用类型，目前只支持 function */
  type: 'function'
  /** 函数调用详情 */
  function: {
    /** 函数名称 */
    name: string
    /** JSON 字符串格式的参数 */
    arguments: string
  }
}

/**
 * 函数定义结构
 * @description 定义一个可被 AI 调用的函数
 */
export interface FunctionDef {
  /** 函数名称 */
  name: string
  /** 函数功能描述 */
  description: string
  /** 函数参数的 JSON Schema */
  parameters: Record<string, unknown>
}

/**
 * 工具定义
 * @description 包装函数定义为工具
 */
export interface Tool {
  /** 工具类型 */
  type: 'function'
  /** 函数定义 */
  function: FunctionDef
}

/**
 * 消息显示状态
 * @description 描述消息的当前显示状态，用于控制 UI 渲染
 * - idle: 正常显示（已完成）
 * - streaming: 正在流式生成
 * - waiting: 等待响应（用户消息发送后，等待 AI 响应）
 * - error: 错误（可重试）
 * - regenerating: 重新生成中
 */
export type MessageDisplayState =
  | 'idle'
  | 'streaming'
  | 'waiting'
  | 'error'
  | 'regenerating'

/**
 * 文件附件类型
 */
export interface FileAttachment {
  /** 文件名 */
  name: string
  /** 文件类型 */
  type: 'txt' | 'md'
  /** 文件大小（字节） */
  size: number
  /** 文件内容（由后端读取） */
  content: string
}

/**
 * 消息结构
 * @description 聊天系统中单条消息的完整数据结构
 */
export interface Message {
  /** 消息唯一标识 */
  id: string
  /** 消息角色 */
  role: MessageRole
  /** 消息文本内容 */
  content: string
  /** 思考过程（仅 AI 消息，需启用思考模式） */
  thinking?: string
  /** 工具调用列表 */
  toolCalls?: ToolCall[]
  /** 是否出现错误 */
  hasError?: boolean
  /** 会话 ID（用于断点续传） */
  sessionId?: string
  /** 用户消息（用于继续生成） */
  userMessage?: string
  /** 是否正在流式传输中 */
  isStreaming?: boolean
  /** 时间戳 */
  timestamp?: number
  /** 文件附件列表（仅用户消息） */
  attachments?: FileAttachment[]
  /** 消息显示状态（用于控制 UI 渲染） */
  displayState?: MessageDisplayState
}

/**
 * 聊天配置
 * @description 控制聊天行为的配置选项
 */
export interface ChatConfig {
  /** 模型 ID */
  model?: string
  /** 是否启用思考模式（使用 CoT 模型） */
  enableThinking?: boolean
  /** 思考过程的 token 预算 */
  thinkingBudget?: number
  /** 可用的工具列表 */
  tools?: Tool[]
  /** 是否启用文本转语音 */
  enableTTS?: boolean
  /** TTS 语音 ID */
  ttsVoice?: string
  /** TTS 语速（0.5 - 2.0） */
  ttsSpeed?: number
}

/**
 * SSE 数据结构
 * @description 服务器推送的流式数据
 */
export interface SSEData {
  /** 事件类型 */
  type: SSEEventType
  /** 文本内容（thinking 或 answer） */
  content?: string
  /** 工具调用列表（仅 tool_calls 类型） */
  tool_calls?: ToolCall[]
  /** 会话 ID */
  sessionId?: string
  /** 传输进度（0-1） */
  progress?: number
}

/**
 * 中断原因类型
 * @description 描述消息生成被中断的原因
 * - user_stop: 用户主动点击停止按钮
 * - user_retry: 用户点击重试按钮
 * - tab_hidden: 标签页切换导致暂停
 * - network_error: 网络错误导致中断
 */
export type AbortReason = 'user_stop' | 'user_retry' | 'tab_hidden' | 'network_error'

/**
 * 管道状态
 * @description 聊天管道的全局状态
 * @remarks 用于 useChatPipeline hook
 */
export interface PipelineState {
  /** 消息列表 */
  messages: Message[]
  /** 是否正在加载（生成回复） */
  isLoading: boolean
  /** 是否正在生成音频 */
  isGeneratingAudio: boolean
  /** 是否正在播放音频 */
  isPlayingAudio: boolean
}


