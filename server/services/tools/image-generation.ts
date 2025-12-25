/**
 * 图片生成工具
 *
 * 使用 SiliconFlow API 生成图片并保存到本地存储
 * 支持异步执行、进度回调、取消操作
 */

import type { Tool } from './types'
import { generateImage } from '@/server/services/image/siliconflow'
import { downloadAndSave } from '@/server/services/image/storage'

/** 支持的图片尺寸 */
const SUPPORTED_IMAGE_SIZES = [
  '1024x1024',
  '512x1024',
  '768x512',
  '768x1024',
  '1024x576',
  '576x1024',
] as const

const DEFAULT_IMAGE_SIZE = '1024x1024'

/** 进度回调类型 */
export type ImageProgressCallback = (progress: number) => void

/** 异步执行选项 */
export interface ImageGenerationExecOptions {
  signal?: AbortSignal
  onProgress?: ImageProgressCallback
}

/** 图片生成结果 */
export interface ImageGenerationResult {
  url: string
  message: string
  width: number
  height: number
}

/**
 * 执行图片生成（支持异步）
 */
export async function executeImageGeneration(
  args: Record<string, unknown>,
  options: ImageGenerationExecOptions = {}
): Promise<ImageGenerationResult> {
  const { signal, onProgress } = options
  const prompt = args.prompt as string
  const negativePrompt = args.negative_prompt as string | undefined
  const imageSize = (args.image_size as string) || DEFAULT_IMAGE_SIZE

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('prompt 不能为空')
  }

  // 检查是否已取消
  if (signal?.aborted) {
    throw new Error('任务已取消')
  }

  // 阶段 1: 调用 API (0-60%)
  onProgress?.(10)
  const result = await generateImage({
    prompt: prompt.trim(),
    negative_prompt: negativePrompt,
    image_size: imageSize,
  })
  
  if (signal?.aborted) throw new Error('任务已取消')
  onProgress?.(60)

  // 阶段 2: 下载保存 (60-100%)
  onProgress?.(70)
  const stored = await downloadAndSave(result.url)
  
  if (signal?.aborted) throw new Error('任务已取消')
  onProgress?.(100)

  return {
    url: stored.localUrl,
    message: '图片已生成完成。',
    width: parseInt(imageSize.split('x')[0]) || 512,
    height: parseInt(imageSize.split('x')[1]) || 512,
  }
}

/**
 * 创建图片生成工具（同步版本，兼容现有逻辑）
 */
export function createImageGenerationTool(): Tool {
  return {
    name: 'generate_image',
    description: '生成图片。当用户要求生成、创作、画图片时使用。重要：每个请求只调用一次，prompt 必须使用英文。',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '图片描述，必须使用英文（English only）。描述要详细，包含主体、风格、光线、构图等。',
        },
        negative_prompt: {
          type: 'string',
          description: '不希望出现的内容',
        },
        image_size: {
          type: 'string',
          description: '图片尺寸',
          enum: [...SUPPORTED_IMAGE_SIZES],
        },
      },
      required: ['prompt'],
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      try {
        const result = await executeImageGeneration(args)
        return JSON.stringify(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        console.error('[ImageGeneration] Error:', message)
        return `图片生成失败: ${message}`
      }
    },
  }
}
