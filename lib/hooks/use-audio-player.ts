'use client'

/**
 * 音频播放器 Hook
 * 
 * 用于管理 TTS（文本转语音）功能，包括：
 * - 调用 TTS API 生成音频
 * - 控制音频播放/暂停/停止
 * - 管理播放状态和语音选择
 * - 自动清理音频资源
 * 
 * @example
 * ```tsx
 * function Message({ content }) {
 *   const { isPlaying, playText, toggle, selectedVoice } = useAudioPlayer()
 *   
 *   return (
 *     <div>
 *       <p>{content}</p>
 *       <button onClick={() => playText(content)}>
 *         {isPlaying ? '暂停' : '播放'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 * 
 * @module hooks/use-audio-player
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChatAPI } from '@/lib/services/chat-api'

/**
 * 音频播放器 Hook
 * 
 * @returns {Object} Hook 返回值
 * @returns {boolean} isPlaying - 是否正在播放
 * @returns {boolean} isGenerating - 是否正在生成音频
 * @returns {string} selectedVoice - 当前选中的语音 ID
 * @returns {Function} setSelectedVoice - 设置语音 ID
 * @returns {Function} playText - 播放文本（调用 TTS API）
 * @returns {Function} toggle - 切换播放/暂停
 * @returns {Function} stop - 停止播放
 */
export function useAudioPlayer() {
  /** 是否正在播放 */
  const [isPlaying, setIsPlaying] = useState(false)
  /** 是否正在生成音频 */
  const [isGenerating, setIsGenerating] = useState(false)
  /** 当前选中的语音 ID（使用完整格式：模型名:音色ID） */
  const [selectedVoice, setSelectedVoice] = useState('FunAudioLLM/CosyVoice2-0.5B:diana')
  /** Audio 元素引用 */
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** 音频 Blob URL 引用（用于清理） */
  const audioURLRef = useRef<string | null>(null)

  /**
   * 播放文本
   * 
   * @description 
   * 调用 TTS API 将文本转为语音并播放。
   * 自动管理音频资源的创建和释放。
   * 
   * @param {string} text - 要转换的文本内容
   * @param {string} [voice] - 语音 ID，不传则使用 selectedVoice
   * @throws {Error} TTS API 调用失败或播放失败
   * 
   * @example
   * ```tsx
   * await playText('你好，世界', 'diana')
   * ```
   */
  const playText = useCallback(async (text: string, voice?: string) => {
    setIsGenerating(true)

    try {
      // 确定使用哪个语音
      const voiceToUse = voice || selectedVoice
      // 调用 TTS API
      const audioBlob = await ChatAPI.textToSpeech(text, voiceToUse)

      // 清理旧的音频 URL
      if (audioURLRef.current) {
        URL.revokeObjectURL(audioURLRef.current)
      }

      // 创建新的音频 URL
      const audioURL = URL.createObjectURL(audioBlob)
      audioURLRef.current = audioURL

      // 初始化 Audio 元素（仅第一次）
      if (!audioRef.current) {
        audioRef.current = new Audio()
        // 设置事件监听器
        audioRef.current.onplay = () => setIsPlaying(true)
        audioRef.current.onpause = () => setIsPlaying(false)
        audioRef.current.onended = () => setIsPlaying(false)
        audioRef.current.onerror = (error) => {
          console.error('Audio playback error:', error)
          setIsPlaying(false)
          setIsGenerating(false)
        }
      }

      // 设置音频源并播放
      audioRef.current.src = audioURL
      
      try {
        await audioRef.current.play()
      } catch (playError) {
        // 可能被浏览器的自动播放策略阻止
        console.error('Auto-play blocked:', playError)
        setIsPlaying(false)
      }
      
      setIsGenerating(false)
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsGenerating(false)
      throw error
    }
  }, [selectedVoice])

  /**
   * 切换播放/暂停
   * 
   * @description 
   * 如果正在播放则暂停，如果暂停则继续播放。
   * 
   * @example
   * ```tsx
   * <button onClick={toggle}>
   *   {isPlaying ? '暂停' : '播放'}
   * </button>
   * ```
   */
  const toggle = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Play error:', error)
        setIsPlaying(false)
      })
    }
  }, [isPlaying])

  /**
   * 停止播放
   * 
   * @description 
   * 暂停播放并将播放位置重置为开头。
   * 
   * @example
   * ```tsx
   * <button onClick={stop}>停止</button>
   * ```
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (audioURLRef.current) {
        URL.revokeObjectURL(audioURLRef.current)
      }
    }
  }, [])

  return {
    isPlaying,
    isGenerating,
    selectedVoice,
    setSelectedVoice,
    playText,
    toggle,
    stop,
  }
}
