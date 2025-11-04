export async function POST(req: Request) {
  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json(
      { error: 'SILICONFLOW_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const { text, voice, format = 'mp3', speed = 1.0 } = await req.json()

    if (!text?.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 })
    }

    // 验证参数
    const validFormats = ['mp3', 'opus', 'wav', 'pcm']
    if (!validFormats.includes(format)) {
      return Response.json(
        { error: `Invalid format: ${format}. Must be one of ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    if (speed < 0.25 || speed > 4.0) {
      return Response.json(
        { error: 'Speed must be between 0.25 and 4.0' },
        { status: 400 }
      )
    }

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model: 'fnlp/MOSS-TTSD-v0.5',
      input: text,
      response_format: format,
      speed,
      stream: true,
    }

    // 如果指定了音色
    if (voice) {
      requestBody.voice = voice
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
      return Response.json(
        {
          error: `TTS API error: ${response.status} - ${errorText}`,
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
        'Cache-Control': 'no-cache',
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

