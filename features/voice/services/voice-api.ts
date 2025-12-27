/**
 * 语音 API 服务
 * 
 * 封装语音相关的 API 调用：
 * - 文本转语音（TTS）
 * - 语音转文本（STT）
 */

export class VoiceAPI {
  /**
   * 文本转语音
   */
  static async textToSpeech(
    text: string,
    voice?: string,
    speed = 1.0,
    abortSignal?: AbortSignal
  ): Promise<Blob> {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voice || 'FunAudioLLM/CosyVoice2-0.5B:diana',
        speed,
        format: 'mp3',
        gain: 0.0,
      }),
      signal: abortSignal,
    })

    if (!response.ok) throw new Error(`TTS error: ${response.status}`)
    return await response.blob()
  }

  /**
   * 语音转文本
   */
  static async speechToText(
    audio: File,
    abortSignal?: AbortSignal
  ): Promise<{ text: string; language?: string; duration?: number }> {
    const formData = new FormData()
    formData.append('audio', audio)

    const response = await fetch('/api/speech', {
      method: 'POST',
      body: formData,
      signal: abortSignal,
    })

    if (!response.ok) throw new Error(`STT error: ${response.status}`)
    return await response.json()
  }
}

// 兼容旧导出名
export { VoiceAPI as ChatAPI }
