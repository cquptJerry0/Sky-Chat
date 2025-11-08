'use client'

/**
 * 音频录制 Hook
 * 
 * 使用浏览器的 MediaRecorder API 实现音频录制功能。
 * 支持录音、停止、清理等操作。
 * 
 * @example
 * ```tsx
 * function VoiceInput() {
 *   const { isRecording, audioBlob, startRecording, stopRecording } = useAudioRecorder()
 *   
 *   const handleVoiceInput = async () => {
 *     if (isRecording) {
 *       stopRecording()
 *     } else {
 *       await startRecording()
 *     }
 *   }
 *   
 *   useEffect(() => {
 *     if (audioBlob) {
 *       // 处理录音结果（如转文字）
 *       sendToSTT(audioBlob)
 *     }
 *   }, [audioBlob])
 *   
 *   return (
 *     <button onClick={handleVoiceInput}>
 *       {isRecording ? '停止录音' : '开始录音'}
 *     </button>
 *   )
 * }
 * ```
 * 
 * @module hooks/use-audio-recorder
 */

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * 音频录制 Hook
 * 
 * @returns {Object} Hook 返回值
 * @returns {boolean} isRecording - 是否正在录音
 * @returns {Blob | null} audioBlob - 录制完成的音频 Blob
 * @returns {Function} startRecording - 开始录音
 * @returns {Function} stopRecording - 停止录音
 * @returns {Function} clearAudio - 清空录音数据
 */
export function useAudioRecorder() {
  /** 是否正在录音 */
  const [isRecording, setIsRecording] = useState(false)
  /** 录制完成的音频 Blob */
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  /** MediaRecorder 实例引用 */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  /** 音频数据块缓存 */
  const chunksRef = useRef<Blob[]>([])
  /** MediaStream 引用（用于清理） */
  const streamRef = useRef<MediaStream | null>(null)

  /**
   * 开始录音
   * 
   * @description 
   * 请求麦克风权限并开始录音。
   * 录音数据会以 audio/webm 格式保存。
   * 
   * @throws {Error} 麦克风权限被拒绝或不支持
   * 
   * @example
   * ```tsx
   * <button onClick={async () => {
   *   try {
   *     await startRecording()
   *   } catch (error) {
   *     alert('无法访问麦克风')
   *   }
   * }}>
   *   开始录音
   * </button>
   * ```
   */
  const startRecording = useCallback(async () => {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // 创建 MediaRecorder 实例
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // 监听数据可用事件
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // 监听停止事件
      mediaRecorder.onstop = () => {
        // 合并所有音频数据块
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        // 释放麦克风资源
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      // 开始录音
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }, [])

  /**
   * 停止录音
   * 
   * @description 
   * 停止录音并生成音频 Blob。
   * 录音结果会自动保存到 audioBlob 状态中。
   * 
   * @example
   * ```tsx
   * <button onClick={stopRecording} disabled={!isRecording}>
   *   停止录音
   * </button>
   * ```
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  /**
   * 清空录音数据
   * 
   * @description 
   * 清除当前的音频 Blob 和缓存数据。
   * 
   * @example
   * ```tsx
   * <button onClick={clearAudio}>
   *   清除录音
   * </button>
   * ```
   */
  const clearAudio = useCallback(() => {
    setAudioBlob(null)
    chunksRef.current = []
  }, [])

  // 清理资源：组件卸载时停止录音并释放麦克风
  useEffect(() => {
    return () => {
      // 如果还在录音，停止录音
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      // 释放麦克风资源
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isRecording])

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearAudio,
  }
}

