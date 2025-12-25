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
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return Response.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

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

    const MAX_SIZE = 10 * 1024 * 1024
    if (audioFile.size > MAX_SIZE) {
      return Response.json(
        { error: 'Audio file too large (max 10MB)' },
        { status: 400 }
      )
    }

    const apiFormData = new FormData()
    apiFormData.append('file', audioFile)
    apiFormData.append('model', 'FunAudioLLM/SenseVoiceSmall')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)

    try {
      const response = await fetch(
        'https://api.siliconflow.cn/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
          },
          body: apiFormData,
          signal: controller.signal,
        }
      )

      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('STT API error:', errorText)
        return Response.json(
          {
            error: `Speech transcription failed: ${response.status}`,
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
    } catch (fetchError) {
      clearTimeout(timeout)
      if ((fetchError as Error).name === 'AbortError') {
        return Response.json(
          { error: 'Request timeout (120s)' },
          { status: 408 }
        )
      }
      throw fetchError
    }
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
