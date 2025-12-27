/**
 * 工具服务入口
 */

import { ToolRegistry } from './registry'
import { createWebSearchTool } from './web-search'
import { createImageGenerationTool } from './image-generation'
import { isSiliconFlowS3Available } from '@/server/services/image/network-probe'

// 创建全局工具注册表
const toolRegistry = new ToolRegistry()

// 工具初始化 Promise
let toolsInitPromise: Promise<void> | null = null

/**
 * 初始化所有工具（只执行一次）
 */
async function initTools(): Promise<void> {
  // 注册 web_search 工具
  if (process.env.TAVILY_API_KEY) {
    toolRegistry.register(createWebSearchTool(process.env.TAVILY_API_KEY))
  } else {
    console.warn('[Tools] TAVILY_API_KEY not configured, web_search disabled')
  }

  // 注册 generate_image 工具（需要探测网络）
  if (process.env.SILICONFLOW_API_KEY) {
    const s3Available = await isSiliconFlowS3Available()
    if (s3Available) {
      toolRegistry.register(createImageGenerationTool())
    } else {
      console.warn('[Tools] SiliconFlow S3 不可达，generate_image disabled')
    }
  } else {
    console.warn('[Tools] SILICONFLOW_API_KEY not configured, generate_image disabled')
  }
}

/**
 * 确保工具初始化完成
 * 在使用工具前调用此函数
 */
export async function ensureToolsReady(): Promise<void> {
  if (!toolsInitPromise) {
    toolsInitPromise = initTools()
  }
  await toolsInitPromise
}

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
} from './types'

// 导出工具创建函数
export { createWebSearchTool } from './web-search'
export { createImageGenerationTool } from './image-generation'
export { ToolRegistry } from './registry'
