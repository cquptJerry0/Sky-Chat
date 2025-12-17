/**
 * 工具调用处理器
 * 
 * 解析 AI 返回的 tool_calls，执行工具，格式化结果
 */

import type { ToolCall, ParsedToolCall, ToolCallResult, ToolMessage, IToolRegistry } from './types'

/**
 * 解析 tool_calls
 */
export function parseToolCalls(toolCalls: ToolCall[]): ParsedToolCall[] {
  return toolCalls.map(call => {
    let args: Record<string, unknown> = {}
    
    try {
      args = JSON.parse(call.function.arguments)
    } catch (error) {
      console.error(`[ToolHandler] Failed to parse arguments for ${call.function.name}:`, error)
    }
    
    return {
      id: call.id,
      name: call.function.name,
      arguments: args,
    }
  })
}

/**
 * 格式化工具结果为消息
 */
export function formatToolMessage(result: ToolCallResult): ToolMessage {
  return {
    role: 'tool',
    tool_call_id: result.toolCallId,
    content: result.content,
  }
}

/**
 * 执行单个工具调用
 */
export async function executeToolCall(
  parsedCall: ParsedToolCall,
  registry: IToolRegistry
): Promise<ToolCallResult> {
  try {
    const content = await registry.executeByName(parsedCall.name, parsedCall.arguments)
    return {
      toolCallId: parsedCall.id,
      name: parsedCall.name,
      content,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      toolCallId: parsedCall.id,
      name: parsedCall.name,
      content: `工具执行失败: ${message}`,
      success: false,
    }
  }
}

/**
 * 批量执行工具调用
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  registry: IToolRegistry
): Promise<ToolCallResult[]> {
  const parsedCalls = parseToolCalls(toolCalls)
  
  // 并行执行所有工具调用
  const results = await Promise.all(
    parsedCalls.map(call => executeToolCall(call, registry))
  )
  
  return results
}

/**
 * 将工具调用结果转换为消息数组
 */
export function formatToolMessages(results: ToolCallResult[]): ToolMessage[] {
  return results.map(formatToolMessage)
}

/**
 * 从 tool_calls 中提取搜索查询（用于前端显示）
 */
export function extractSearchQuery(toolCalls: ToolCall[]): string | null {
  const webSearchCall = toolCalls.find(call => call.function.name === 'web_search')
  
  if (!webSearchCall) {
    return null
  }
  
  try {
    const args = JSON.parse(webSearchCall.function.arguments)
    return args.query || null
  } catch {
    return null
  }
}
