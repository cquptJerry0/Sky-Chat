/**
 * 图片生成 API 路由
 *
 * POST /api/image/generate
 *
 * 调用 SiliconFlow API 生成图片，下载并保存到本地
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/server/services/image/siliconflow'
import { downloadAndSave } from '@/server/services/image/storage'

/**
 * 请求体格式
 */
interface GenerateRequest {
  prompt: string
  negative_prompt?: string
  model?: string
  image_size?: string
}

/**
 * 响应格式
 */
interface GenerateResponse {
  success: boolean
  url?: string
  error?: string
  seed?: number
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  try {
    const body = (await request.json()) as GenerateRequest

    // 验证必填参数
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: '缺少 prompt 参数' },
        { status: 400 }
      )
    }

    // 调用 SiliconFlow API 生成图片
    const result = await generateImage({
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      model: body.model,
      image_size: body.image_size,
    })

    // 下载并保存图片到本地
    const stored = await downloadAndSave(result.url)

    return NextResponse.json({
      success: true,
      url: stored.localUrl,
      seed: result.seed,
    })
  } catch (error) {
    console.error('[Image Generate] Error:', error)

    const errorMessage = error instanceof Error ? error.message : '图片生成失败'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
