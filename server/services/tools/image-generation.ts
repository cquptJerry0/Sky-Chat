/**
 * 图片生成工具
 *
 * 使用 SiliconFlow API 生成图片并保存到本地存储
 */

import type { Tool } from './types'
import { generateImage } from '@/server/services/image/siliconflow'
import { downloadAndSave } from '@/server/services/image/storage'

/**
 * 支持的图片尺寸
 */
const SUPPORTED_IMAGE_SIZES = [
  '1024x1024',
  '512x1024',
  '768x512',
  '768x1024',
  '1024x576',
  '576x1024',
] as const

/**
 * 默认图片尺寸
 */
const DEFAULT_IMAGE_SIZE = '1024x1024'

/**
 * 创建图片生成工具
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
      console.log('[ImageGeneration] Tool called with args:', args)
      
      const prompt = args.prompt as string
      const negativePrompt = args.negative_prompt as string | undefined
      const imageSize = (args.image_size as string) || DEFAULT_IMAGE_SIZE

      // 验证 prompt
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return '图片生成失败: prompt 不能为空'
      }

      try {
        // 调用 SiliconFlow API 生成图片
        console.log('[ImageGeneration] Calling SiliconFlow API...')
        const result = await generateImage({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt,
          image_size: imageSize,
        })
        console.log('[ImageGeneration] SiliconFlow returned URL:', result.url)

        // 下载图片到本地存储
        console.log('[ImageGeneration] Downloading and saving image...')
        const stored = await downloadAndSave(result.url)
        console.log('[ImageGeneration] Image saved to:', stored.localUrl)

        // 返回 JSON 格式，包含本地 URL 和给 AI 的简短消息
        // stream.handler 会解析 URL 传给前端
        // formatToolMessage 会只把 message 给 AI，避免 AI 复述长 URL
        return JSON.stringify({
          url: stored.localUrl,
          message: '图片已生成完成。',
          width: parseInt(imageSize.split('x')[0]) || 512,
          height: parseInt(imageSize.split('x')[1]) || 512,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        console.error('[ImageGeneration] Error:', message)
        return `图片生成失败: ${message}`
      }
    },
  }
}
