/**
 * 聊天 API 服务
 * 
 * 封装所有与后端 API 的交互，包括：
 * - 聊天消息发送（支持断点续传）
 * - 文本转语音（TTS）
 * - 语音转文本（STT）
 * 
 * 所有方法都支持 AbortSignal 用于请求中断。
 * 
 * @module services/chat-api
 */

import type { ChatConfig } from '@/features/chat/types/chat'

export class ChatAPI {
  /**
   * 发送聊天消息
   * 
   * @description 
   * 调用 /api/chat 接口发送用户消息，返回流式响应。
   * 支持断点续传和请求中断。
   * 
   * @param {string} message - 用户消息内容
   * @param {ChatConfig} [config] - 聊天配置
   * @param {string} [resumeSessionId] - 续传会话 ID
   * @param {AbortSignal} [abortSignal] - 中断信号
   * @returns {Promise<Response>} Fetch Response 对象（需读取 body）
   * @throws {Error} API 调用失败
   * 
   * @example
   * ```ts
   * const controller = new AbortController()
   * const response = await ChatAPI.sendMessage(
   *   '你好',
   *   { enableThinking: true },
   *   undefined,
   *   controller.signal
   * )
   * const sessionId = response.headers.get('X-Session-ID')
   * const reader = response.body?.getReader()
   * ```
   */
  static async sendMessage(
    message: string,
    config?: ChatConfig,
    resumeSessionId?: string,
    abortSignal?: AbortSignal
  ) {
    // 构建请求体
    const body: Record<string, unknown> = { message }

    // 模型配置
    if (config?.model) body.model = config.model
    
    // 断点续传：传入 sessionId 继续生成
    if (resumeSessionId) body.resumeSessionId = resumeSessionId
    
    // 思考模式配置
    if (config?.enableThinking) {
      body.enableThinking = true
      body.thinkingBudget = config.thinkingBudget || 4096
    }
    
    // 工具调用配置
    if (config?.tools?.length) body.tools = config.tools

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortSignal,
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return response
  }

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
   * 
   * @example
   * ```ts
   * const audioBlob = await ChatAPI.textToSpeech(
   *   '你好，世界',
   *   'diana',
   *   1.0
   * )
   * const url = URL.createObjectURL(audioBlob)
   * const audio = new Audio(url)
   * await audio.play()
   * ```
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
        voice: voice || 'FunAudioLLM/CosyVoice2-0.5B:diana', // 默认使用欢快女声
        speed,
        format: 'mp3',
        gain: 0.0, // 默认音量增益
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
   *
   * @example
   * ```ts
   * const audioFile = new File([audioBlob], 'recording.webm')
   * const result = await ChatAPI.speechToText(audioFile)
   * console.log(result.text) // 识别出的文本
   * ```
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


