/**
 * 工具系统类型定义
 */

/**
 * 工具参数 Schema
 */
export interface ToolParameterSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    description: string
    enum?: string[]
  }>
  required: string[]
}

/**
 * 工具定义
 */
export interface Tool {
  name: string
  description: string
  parameters: ToolParameterSchema
  execute: (args: Record<string, unknown>) => Promise<string>
}

/**
 * OpenAI Function Calling 格式的工具定义
 */
export interface OpenAIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolParameterSchema
  }
}

/**
 * AI 返回的工具调用
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * 解析后的工具调用
 */
export interface ParsedToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/**
 * 工具执行结果
 */
export interface ToolCallResult {
  toolCallId: string
  name: string
  content: string
  success: boolean
}

/**
 * 工具消息（发送给 AI 的格式）
 */
export interface ToolMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

/**
 * 工具注册表接口
 */
export interface IToolRegistry {
  register(tool: Tool): void
  get(name: string): Tool | undefined
  getToolDefinitions(): OpenAIToolDefinition[]
  executeByName(name: string, args: Record<string, unknown>): Promise<string>
  has(name: string): boolean
  getAll(): Tool[]
}

/**
 * SSE 工具调用事件
 */
export interface ToolCallEvent {
  type: 'tool_call'
  name: string
  query?: string       // web_search 工具的搜索查询
  prompt?: string      // generate_image 工具的图片描述
  sessionId: string
}

/**
 * SSE 工具结果事件
 */
export interface ToolResultEvent {
  type: 'tool_result'
  name: string
  resultCount?: number // web_search 工具的结果数量
  imageUrl?: string    // generate_image 工具的图片 URL
  success: boolean
  sessionId: string
}
