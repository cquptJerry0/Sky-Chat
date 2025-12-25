/**
 * 硅基流动聊天模型配置
 * 
 * 基于官方 API 文档精选的常用模型列表
 * @see https://docs.siliconflow.cn/api-reference/chat/create
 */

export interface Model {
  /** 模型 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 描述 */
  description: string
  /** 模型类别 */
  category: 'reasoning' | 'chat' | 'code' | 'vision'
  /** 是否为原生推理模型（只用 thinking_budget，不支持 enable_thinking） */
  isReasoningModel: boolean
  /** 是否支持思考开关（普通模型可用 enable_thinking 参数） */
  supportsThinkingToggle: boolean
  /** 是否为默认模型 */
  default?: boolean
  /** 最大 tokens */
  maxTokens?: number
}

/**
 * 聊天模型列表
 * 
 * @description
 * 精选常用模型，按类别分组：
 * - reasoning: 推理模型（支持深度思考）
 * - chat: 对话模型（快速响应）
 * - code: 代码专用模型
 */
export const CHAT_MODELS: Model[] = [
  // GLM 模型（默认）
  {
    id: 'zai-org/GLM-4.6',
    name: 'GLM-4.6',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    default: true,
    maxTokens: 2048,
  },
  
  // Qwen 模型
  {
    id: 'Qwen/Qwen3-8B',
    name: 'Qwen3-8B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
]

/**
 * 获取默认模型
 */
export function getDefaultModel(): Model {
  return CHAT_MODELS.find(m => m.default) || CHAT_MODELS[4]
}

/**
 * 根据 ID 获取模型
 */
export function getModelById(id: string): Model | undefined {
  return CHAT_MODELS.find(m => m.id === id)
}

/**
 * 按类别获取模型
 */
export function getModelsByCategory(category: Model['category']): Model[] {
  return CHAT_MODELS.filter(m => m.category === category)
}

/**
 * 模型类别显示名称
 */
export const MODEL_CATEGORY_NAMES = {
  reasoning: '推理模型',
  chat: '对话模型',
  code: '代码模型',
  vision: '视觉模型',
} as const

