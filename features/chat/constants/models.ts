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
  // Reasoning 模型（原生推理，只用 thinking_budget）
  {
    id: 'Qwen/QwQ-32B',
    name: 'QwQ-32B',
    description: '深度推理，适合复杂问题',
    category: 'reasoning',
    isReasoningModel: true,
    supportsThinkingToggle: false,
    maxTokens: 4096,
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    name: 'DeepSeek-R1',
    description: '高级推理模型',
    category: 'reasoning',
    isReasoningModel: true,
    supportsThinkingToggle: false,
    maxTokens: 4096,
  },
  {
    id: 'Qwen/Qwen3-235B-A22B-Thinking-2507',
    name: 'Qwen3-235B Thinking',
    description: 'Qwen3 超大推理模型',
    category: 'reasoning',
    isReasoningModel: true,
    supportsThinkingToggle: false,
    maxTokens: 4096,
  },
  {
    id: 'Qwen/Qwen3-30B-A3B-Thinking-2507',
    name: 'Qwen3-30B Thinking',
    description: 'Qwen3 推理版本',
    category: 'reasoning',
    isReasoningModel: true,
    supportsThinkingToggle: false,
    maxTokens: 4096,
  },
  
  // 普通模型（支持 enable_thinking 开关）
  {
    id: 'Qwen/Qwen3-8B',
    name: 'Qwen3-8B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen3-14B',
    name: 'Qwen3-14B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen3-32B',
    name: 'Qwen3-32B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen3-30B-A3B',
    name: 'Qwen3-30B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen3-235B-A22B',
    name: 'Qwen3-235B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 4096,
  },
  {
    id: 'zai-org/GLM-4.6',
    name: 'GLM-4.6',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'tencent/Hunyuan-A13B-Instruct',
    name: 'Hunyuan-A13B',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'deepseek-ai/DeepSeek-V3.1-Terminus',
    name: 'DeepSeek-V3.1-Terminus',
    description: '支持思考开关',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  {
    id: 'Pro/deepseek-ai/DeepSeek-V3.1-Terminus',
    name: 'DeepSeek-V3.1-Terminus Pro',
    description: '支持思考开关（Pro版本）',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: true,
    maxTokens: 2048,
  },
  
  // 普通模型（不支持思考）
  {
    id: 'deepseek-ai/DeepSeek-V3',
    name: 'DeepSeek-V3',
    description: '均衡的性能',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: false,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen2.5-72B',
    description: '强大的对话能力',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: false,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    name: 'Qwen2.5-7B',
    description: '快速响应',
    category: 'chat',
    isReasoningModel: false,
    supportsThinkingToggle: false,
    default: true,
    maxTokens: 1024,
  },
  
  // 代码模型
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Qwen-Coder-32B',
    description: '代码生成专家',
    category: 'code',
    isReasoningModel: false,
    supportsThinkingToggle: false,
    maxTokens: 2048,
  },
  {
    id: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
    name: 'Qwen3-Coder-30B',
    description: '新一代代码模型',
    category: 'code',
    isReasoningModel: false,
    supportsThinkingToggle: false,
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

