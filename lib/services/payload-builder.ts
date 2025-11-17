import { getModelById, getDefaultModel } from '@/features/chat/constants/models'
import type { ChatConfig } from '@/features/chat/types/chat'

/**
 * 请求 Payload 构建器
 * 
 * 职责：
 * 1. 根据模型类型构建正确的参数
 * 2. 处理推理模型 vs 普通模型的差异
 * 3. 确保发送给后端的参数符合 SiliconFlow API 规范
 */
export class PayloadBuilder {
  /**
   * 构建聊天请求体
   * 
   * @param message - 用户消息内容
   * @param config - 聊天配置
   * @returns 完整的请求 payload
   */
  static buildChatPayload(
    message: string,
    config: ChatConfig
  ): Record<string, unknown> {
    const modelId = config.model || getDefaultModel().id
    const model = getModelById(modelId)
    
    const payload: Record<string, unknown> = {
      message,
      model: modelId,
    }
    
    // 纯推理模型：只设置 thinking_budget
    if (model?.isReasoningModel) {
      payload.thinkingBudget = config.thinkingBudget || 4096
    }
    // 支持思考开关的模型：根据用户选择
    else if (model?.supportsThinkingToggle) {
      if (config.enableThinking !== undefined) {
        payload.enableThinking = config.enableThinking
        if (config.enableThinking) {
          payload.thinkingBudget = config.thinkingBudget || 4096
        }
      }
    }
    // 普通模型：不发送任何思考相关参数
    
    // 工具调用
    if (config.tools?.length) {
      payload.tools = config.tools
    }
    
    return payload
  }
}

