/**
 * SiliconFlow AI API 封装
 * 
 * 负责与 SiliconFlow API 的通信
 */

import { getModelById } from '@/features/chat/constants/models'

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  enableThinking?: boolean
  thinkingBudget?: number
  tools?: unknown[]
}

export interface SiliconFlowResponse {
  reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * 调用 SiliconFlow Chat Completion API（流式）
 */
export async function createChatCompletion(
  apiKey: string,
  options: ChatCompletionOptions
): Promise<SiliconFlowResponse> {
  const { model, messages, enableThinking = false, thinkingBudget = 4096, tools } = options
  
  const modelInfo = getModelById(model)
  
  // 构建请求体
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
  }

  // Reasoning 模型：只用 thinking_budget
  if (modelInfo?.isReasoningModel) {
    requestBody.thinking_budget = thinkingBudget
  }
  // 普通模型支持思考开关：用 enable_thinking + thinking_budget
  else if (enableThinking && modelInfo?.supportsThinkingToggle) {
    requestBody.enable_thinking = true
    requestBody.thinking_budget = thinkingBudget
  }

  // 如果提供了 tools，添加到请求中
  if (tools && Array.isArray(tools) && tools.length > 0) {
    requestBody.tools = tools
  }

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SiliconFlow API error: ${response.status} - ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No stream available')
  }

  return { reader }
}
