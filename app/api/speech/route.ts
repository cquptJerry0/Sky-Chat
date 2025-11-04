export async function POST(req: Request) {
  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json(
      { error: 'SILICONFLOW_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return Response.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const validTypes = [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ]
    if (!validTypes.includes(audioFile.type)) {
      return Response.json(
        { error: `Invalid file type: ${audioFile.type}` },
        { status: 400 }
      )
    }

    // 调用硅基流动语音转文本 API
    // 根据官方文档，只需要 file 和 model 两个必填字段
    const apiFormData = new FormData()
    apiFormData.append('file', audioFile)
    apiFormData.append('model', 'FunAudioLLM/SenseVoiceSmall')

    const response = await fetch(
      'https://api.siliconflow.cn/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        },
        body: apiFormData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return Response.json(
        {
          error: `Speech transcription failed: ${response.status} - ${errorText}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return Response.json({
      text: data.text,
      language: data.language || 'zh',
      duration: data.duration,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Speech API error:', errorMessage)
    return Response.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

