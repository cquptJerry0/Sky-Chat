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
 * - tool_call: 工具调用开始（用于显示搜索状态）
 * - tool_progress: 工具执行进度（用于长时间运行的工具）
 * - tool_result: 工具调用结果
 * - complete: 流式传输完成
 */
export type SSEEventType = 'thinking' | 'answer' | 'tool_calls' | 'tool_call' | 'tool_progress' | 'tool_result' | 'complete'

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
 * 搜索结果来源
 */
export interface SearchSource {
  title: string
  url: string
  snippet?: string
}

/**
 * 工具执行结果
 * @description 存储工具调用的执行结果，用于持久化
 */
export interface ToolResult {
  /** 关联的 tool_call id */
  toolCallId: string
  /** 工具名称 */
  name: string
  /** 执行结果 */
  result: {
    success: boolean
    /** 图片生成结果 */
    imageUrl?: string
    prompt?: string
    /** 搜索结果 */
    resultCount?: number
    /** 搜索来源列表 */
    sources?: SearchSource[]
    /** 其他数据 */
    [key: string]: unknown
  }
}

/**
 * 工具调用状态
 * @description 运行时状态，用于显示工具执行进度
 */
export type ToolInvocationState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * 工具调用实例
 * @description 单个工具调用的完整状态
 */
export interface ToolInvocation {
  /** 工具调用 ID */
  toolCallId: string
  /** 工具名称 */
  name: string
  /** 执行状态 */
  state: ToolInvocationState
  /** 工具参数 */
  args?: {
    query?: string
    prompt?: string
    [key: string]: unknown
  }
  /** 执行结果 */
  result?: {
    success: boolean
    imageUrl?: string
    resultCount?: number
    sources?: SearchSource[]
    [key: string]: unknown
  }
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
  /** 工具执行结果（持久化存储） */
  toolResults?: ToolResult[]
  /** 工具调用实例列表（运行时状态，支持多个并行工具） */
  toolInvocations?: ToolInvocation[]
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
  /** 工具调用 ID（tool_call/tool_progress/tool_result 事件） */
  toolCallId?: string
  /** 工具名称（tool_call/tool_result 事件） */
  name?: string
  /** 搜索查询（tool_call 事件） */
  query?: string
  /** 图片生成提示词（tool_call 事件） */
  prompt?: string
  /** 结果数量（tool_result 事件） */
  resultCount?: number
  /** 是否成功（tool_result 事件） */
  success?: boolean
  /** 图片 URL（generate_image tool_result 事件） */
  imageUrl?: string
  /** 图片宽度（generate_image tool_result 事件） */
  width?: number
  /** 图片高度（generate_image tool_result 事件） */
  height?: number
  /** 搜索来源列表（web_search tool_result 事件） */
  sources?: SearchSource[]
  /** 预估剩余时间（秒，tool_progress 事件） */
  estimatedTime?: number
  /** 是否被取消（tool_result 事件） */
  cancelled?: boolean
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
 * 流式传输阶段
 * - thinking: 正在生成思考内容
 * - answer: 正在生成回答内容
 * - null: 未在流式传输
 */
export type StreamingPhase = 'thinking' | 'answer' | null

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


