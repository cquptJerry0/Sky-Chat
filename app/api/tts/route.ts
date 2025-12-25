/**
 * 文本转语音 API
 * 
 * @description 
 * 调用硅基流动 TTS API 将文本转换为语音。
 * 使用 FunAudioLLM/CosyVoice2-0.5B 模型，支持：
 * - 8 种系统预置音色
 * - 跨语言语音合成（中英日韩、方言）
 * - 语速和音量控制
 * - 多种输出格式（mp3, wav, opus, pcm）
 * 
 * @endpoint POST /api/tts
 * @see https://docs.siliconflow.cn/api-reference/audio/create-speech
 */
import { getCurrentUserId } from '@/server/auth/utils'

export async function POST(req: Request) {
  // 鉴权
  try {
    await getCurrentUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json(
      { error: 'SILICONFLOW_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const { 
      text, 
      voice = 'FunAudioLLM/CosyVoice2-0.5B:diana', // 默认使用欢快女声
      format = 'mp3', 
      speed = 1.0,
      gain = 0.0, // 音量增益（dB）
    } = await req.json()

    // 验证文本
    if (!text?.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 })
    }

    // 验证输出格式
    const validFormats = ['mp3', 'opus', 'wav', 'pcm']
    if (!validFormats.includes(format)) {
      return Response.json(
        { error: `Invalid format: ${format}. Must be one of ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // 验证语速范围（0.25 - 4.0）
    if (speed < 0.25 || speed > 4.0) {
      return Response.json(
        { error: 'Speed must be between 0.25 and 4.0' },
        { status: 400 }
      )
    }

    // 验证音量增益范围（-10 到 10 dB）
    if (gain < -10 || gain > 10) {
      return Response.json(
        { error: 'Gain must be between -10 and 10 dB' },
        { status: 400 }
      )
    }

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model: 'FunAudioLLM/CosyVoice2-0.5B', // 使用 CosyVoice2-0.5B 模型
      input: text,
      voice, // 格式：FunAudioLLM/CosyVoice2-0.5B:音色ID
      response_format: format,
      speed,
      gain,
      stream: true, // 启用流式响应
    }

    // 调用硅基流动 TTS API
    const response = await fetch(
      'https://api.siliconflow.cn/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS API error:', errorText)
      return Response.json(
        {
          error: `TTS API error: ${response.status}`,
        },
        { status: response.status }
      )
    }

    // 确定 Content-Type
    const contentTypeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      wav: 'audio/wav',
      pcm: 'audio/pcm',
    }

    // 直接返回音频流
    return new Response(response.body, {
      headers: {
        'Content-Type': contentTypeMap[format] || 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('TTS API error:', errorMessage)
    return Response.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}


