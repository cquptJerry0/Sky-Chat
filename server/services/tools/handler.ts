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
  let content = result.content
  
  // 搜索结果：提取 content 字段给 AI
  if (result.name === 'web_search') {
    try {
      const parsed = JSON.parse(result.content)
      content = parsed.content || parsed.error || result.content
    } catch {
      // 不是 JSON，保持原样
    }
  }
  
  // 图片生成结果：只给 AI 简短消息
  if (result.name === 'generate_image') {
    try {
      const parsed = JSON.parse(result.content)
      if (parsed.error) {
        content = parsed.error
      } else if (parsed.url) {
        content = '图片已生成完成。'
      }
    } catch {
      // 不是 JSON，保持原样
    }
  }
  
  return {
    role: 'tool',
    tool_call_id: result.toolCallId,
    content,
  }
}

/**
 * 执行单个工具调用
 */
export async function executeToolCall(
  parsedCall: ParsedToolCall,
  registry: IToolRegistry
): Promise<ToolCallResult> {
  console.log(`[ToolHandler] Executing tool: ${parsedCall.name}`, parsedCall.arguments)
  
  try {
    const content = await registry.executeByName(parsedCall.name, parsedCall.arguments)
    console.log(`[ToolHandler] Tool ${parsedCall.name} completed`)
    return {
      toolCallId: parsedCall.id,
      name: parsedCall.name,
      content,
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ToolHandler] Tool ${parsedCall.name} failed:`, message)
    return {
      toolCallId: parsedCall.id,
      name: parsedCall.name,
      content: JSON.stringify({ error: message }),
      success: false,
    }
  }
}

/**
 * 批量执行工具调用（并行）
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  registry: IToolRegistry
): Promise<ToolCallResult[]> {
  const parsedCalls = parseToolCalls(toolCalls)
  return Promise.all(parsedCalls.map(call => executeToolCall(call, registry)))
}

/**
 * 将工具调用结果转换为消息数组
 */
export function formatToolMessages(results: ToolCallResult[]): ToolMessage[] {
  return results.map(formatToolMessage)
}
