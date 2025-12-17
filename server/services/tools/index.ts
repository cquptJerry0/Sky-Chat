/**
 * 工具服务入口
 * 
 * 导出工具注册表实例和相关类型
 */

import { ToolRegistry } from './registry'
import { createWebSearchTool } from './web-search'

// 创建全局工具注册表实例
const toolRegistry = new ToolRegistry()

// 注册 web_search 工具（仅当 TAVILY_API_KEY 存在时）
const tavilyApiKey = process.env.TAVILY_API_KEY

if (tavilyApiKey) {
  const webSearchTool = createWebSearchTool(tavilyApiKey)
  toolRegistry.register(webSearchTool)
} else {
  console.warn('[Tools] TAVILY_API_KEY not configured, web_search tool disabled')
}

// 导出注册表实例
export { toolRegistry }

// 导出类型
export type {
  Tool,
  ToolCall,
  ParsedToolCall,
  ToolCallResult,
  ToolMessage,
  OpenAIToolDefinition,
  IToolRegistry,
  ToolCallEvent,
  ToolResultEvent,
} from './types'

// 导出工具创建函数
export { createWebSearchTool } from './web-search'
export { ToolRegistry, createToolRegistry } from './registry'
