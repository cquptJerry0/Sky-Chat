export type MessageRole = 'user' | 'assistant'

export type SSEEventType = 'thinking' | 'answer' | 'tool_calls'

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  thinking?: string
  toolCalls?: ToolCall[]
  hasError?: boolean
  sessionId?: string
  isStreaming?: boolean
}

export interface SSEData {
  type: SSEEventType
  content?: string
  tool_calls?: ToolCall[]
}
