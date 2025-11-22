/**
 * 聊天 API 服务
 * 
 * 封装语音相关的 API 调用：
 * - 文本转语音（TTS）
 * - 语音转文本（STT）
 * 
 * @module services/chat-api
 */

export class ChatAPI {
  /**
   * 文本转语音
   * 
   * @description 
   * 调用 /api/tts 接口将文本转换为语音。
   * 返回音频 Blob，可用于播放或下载。
   * 
   * @param {string} text - 要转换的文本
   * @param {string} [voice] - 语音 ID
   * @param {number} [speed=1.0] - 语速（0.5-2.0）
   * @param {AbortSignal} [abortSignal] - 中断信号
   * @returns {Promise<Blob>} 音频 Blob（MP3 格式）
   * @throws {Error} TTS API 调用失败
   */
  static async textToSpeech(
    text: string,
    voice?: string,
    speed = 1.0,
    abortSignal?: AbortSignal
  ) {
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
   *
   * @description
   * 调用 /api/speech 接口将音频文件转换为文本。
   * 支持多种音频格式（webm, mp4, mpeg, wav, ogg）。
   *
   * @param {File} audio - 音频文件（File 或 Blob 对象）
   * @param {AbortSignal} [abortSignal] - 中断信号
   * @returns {Promise<{text: string, language?: string, duration?: number}>} 识别结果
   * @throws {Error} STT API 调用失败
   */
  static async speechToText(audio: File, abortSignal?: AbortSignal) {
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

