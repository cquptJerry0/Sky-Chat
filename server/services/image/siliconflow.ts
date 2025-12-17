/**
 * SiliconFlow 图片生成服务
 *
 * 调用 SiliconFlow API 生成图片
 * 支持 Kolors 和 Qwen-Image 模型
 */

/**
 * 图片生成选项
 */
export interface ImageGenerationOptions {
  /** 图片描述提示词 */
  prompt: string
  /** 负面提示词（不想要的元素） */
  negative_prompt?: string
  /** 模型名称，默认 Kwai-Kolors/Kolors */
  model?: string
  /** 图片尺寸，默认 1024x1024 */
  image_size?: string
  /** 随机种子 */
  seed?: number
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  /** SiliconFlow 返回的临时图片 URL（1小时有效） */
  url: string
  /** 生成使用的种子 */
  seed: number
}

/**
 * SiliconFlow API 响应格式
 */
interface SiliconFlowResponse {
  images: Array<{ url: string }>
  seed: number
  timings?: {
    inference: number
  }
}

const DEFAULT_MODEL = 'Kwai-Kolors/Kolors'
const DEFAULT_IMAGE_SIZE = '1024x1024'
const API_ENDPOINT = 'https://api.siliconflow.cn/v1/images/generations'

/**
 * 生成图片
 *
 * @param options - 生成选项
 * @returns 生成结果，包含临时 URL 和种子
 * @throws Error 当 API Key 未配置或 API 调用失败时
 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const apiKey = process.env.SILICONFLOW_API_KEY

  if (!apiKey) {
    throw new Error('SILICONFLOW_API_KEY 环境变量未配置')
  }

  const {
    prompt,
    negative_prompt,
    model = DEFAULT_MODEL,
    image_size = DEFAULT_IMAGE_SIZE,
    seed,
  } = options

  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    image_size,
  }

  if (negative_prompt) {
    requestBody.negative_prompt = negative_prompt
  }

  if (seed !== undefined) {
    requestBody.seed = seed
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SiliconFlow API 错误: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as SiliconFlowResponse

  if (!data.images || data.images.length === 0) {
    throw new Error('SiliconFlow API 未返回图片')
  }

  return {
    url: data.images[0].url,
    seed: data.seed,
  }
}
