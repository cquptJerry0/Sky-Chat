/**
 * 硅基流动聊天模型配置
 *
 * @see https://docs.siliconflow.cn/api-reference/chat-completions/chat-completions
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
  /** 是否为原生推理模型（只用 thinking_budget） */
  isReasoningModel: boolean
  /** 是否支持 enable_thinking 参数 */
  supportsThinkingToggle: boolean
  /** 是否为默认模型 */
  default?: boolean
  /** 最大 tokens */
  maxTokens?: number
}

/**
 * 聊天模型列表
 */
export const CHAT_MODELS: Model[] = [
  {
    id: 'moonshotai/Kimi-K2-Thinking',
    name: 'Kimi-K2 Thinking',
    description: '工具调用最稳定',
    category: 'reasoning',
    isReasoningModel: true,
    supportsThinkingToggle: false,
    default: true,
    maxTokens: 8192,
  },
  {
    id: 'deepseek-ai/DeepSeek-V3.2',
    name: 'DeepSeek-V3.2',
    description: '最新版本',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 8192,
  },
]

/**
 * 获取默认模型
 */
export function getDefaultModel(): Model {
  return CHAT_MODELS.find(m => m.default) || CHAT_MODELS[0]
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
