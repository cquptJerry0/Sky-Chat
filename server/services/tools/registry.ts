/**
 * 工具注册表
 * 
 * 管理所有可用工具的注册、查找和执行
 */

import type { Tool, IToolRegistry, OpenAIToolDefinition } from './types'

/**
 * 验证工具定义是否完整
 */
function validateTool(tool: Partial<Tool>): tool is Tool {
  if (!tool.name || typeof tool.name !== 'string') {
    throw new Error('Tool must have a valid name')
  }
  if (!tool.description || typeof tool.description !== 'string') {
    throw new Error(`Tool "${tool.name}" must have a description`)
  }
  if (!tool.parameters || typeof tool.parameters !== 'object') {
    throw new Error(`Tool "${tool.name}" must have parameters`)
  }
  if (!tool.execute || typeof tool.execute !== 'function') {
    throw new Error(`Tool "${tool.name}" must have an execute function`)
  }
  return true
}

/**
 * 工具注册表实现
 */
export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    validateTool(tool)
    
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool "${tool.name}" already registered, overwriting`)
    }
    
    this.tools.set(tool.name, tool)
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`)
  }

  /**
   * 按名称获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取所有工具定义（OpenAI Function Calling 格式）
   */
  getToolDefinitions(): OpenAIToolDefinition[] {
    return this.getAll().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * 按名称执行工具
   */
  async executeByName(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.get(name)
    
    if (!tool) {
      throw new Error(`Tool "${name}" not found`)
    }
    
    try {
      return await tool.execute(args)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ToolRegistry] Error executing tool "${name}":`, message)
      throw error
    }
  }
}

/**
 * 创建新的工具注册表实例
 */
export function createToolRegistry(): IToolRegistry {
  return new ToolRegistry()
}
