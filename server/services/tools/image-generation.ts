/**
 * 图片生成工具
 */

import type { Tool } from './types'
import { generateImage } from '@/server/services/image/siliconflow'
import { downloadAndSave } from '@/server/services/image/storage'

const SUPPORTED_SIZES = ['1024x1024', '512x1024', '768x512', '768x1024', '1024x576', '576x1024'] as const

/** 进度回调 */
export type ProgressCallback = (progress: number) => void

/**
 * 执行图片生成（带进度回调）
 */
export async function executeImageGeneration(
  args: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<{ url: string; width: number; height: number }> {
  const prompt = args.prompt as string
  const negativePrompt = args.negative_prompt as string | undefined
  const imageSize = (args.image_size as string) || '1024x1024'

  if (!prompt?.trim()) {
    throw new Error('prompt 不能为空')
  }

  console.log('[ImageGen] 开始生成:', prompt.substring(0, 50))

  // 阶段1: 调用 API (0-60%)
  onProgress?.(10)
  const result = await generateImage({
    prompt: prompt.trim(),
    negative_prompt: negativePrompt,
    image_size: imageSize,
  })
  console.log('[ImageGen] API 返回成功')
  onProgress?.(60)

  // 阶段2: 下载保存 (60-100%)
  onProgress?.(70)
  console.log('[ImageGen] 开始下载:', result.url.substring(0, 80))
  try {
    const stored = await downloadAndSave(result.url)
    console.log('[ImageGen] 保存成功:', stored.localUrl)
    onProgress?.(100)

    return {
      url: stored.localUrl,
      width: parseInt(imageSize.split('x')[0]) || 1024,
      height: parseInt(imageSize.split('x')[1]) || 1024,
    }
  } catch (downloadError) {
    console.error('[ImageGen] 下载失败:', downloadError)
    throw downloadError
  }
}

/**
 * 创建图片生成工具（同步版本，用于工具注册）
 */
export function createImageGenerationTool(): Tool {
  return {
    name: 'generate_image',
    description: '生成图片。当用户要求生成、创作、画、绘制任何图片时，必须调用此工具。不要用文字描述图片，直接调用工具生成。prompt 必须使用英文，每个请求只调用一次。',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '图片描述，必须使用英文。描述要详细，包含主体、风格、光线、构图等。',
        },
        negative_prompt: {
          type: 'string',
          description: '不希望出现的内容',
        },
        image_size: {
          type: 'string',
          description: '图片尺寸',
          enum: [...SUPPORTED_SIZES],
        },
      },
      required: ['prompt'],
    },
    execute: async (args) => {
      try {
        const result = await executeImageGeneration(args)
        return JSON.stringify(result)
      } catch (error) {
        const msg = error instanceof Error ? error.message : '未知错误'
        return JSON.stringify({ error: msg })
      }
    },
  }
}
