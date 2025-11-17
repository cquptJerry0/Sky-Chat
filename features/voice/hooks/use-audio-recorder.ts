'use client'

/**
 * 音频录制 Hook
 *
 * 使用浏览器的 MediaRecorder API 实现音频录制功能。
 * 支持录音、停止、取消等操作。
 *
 * @example
 * ```tsx
 * function VoiceInput() {
 *   const { isRecording, audioBlob, startRecording, stopRecording, cancelRecording } = useAudioRecorder()
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
 *       sendToSTT(audioBlob)
 *     }
 *   }, [audioBlob])
 *
 *   return (
 *     <>
 *       <button onClick={handleVoiceInput}>
 *         {isRecording ? '停止录音' : '开始录音'}
 *       </button>
 *       <button onClick={cancelRecording}>取消</button>
 *     </>
 *   )
 * }
 * ```
 *
 * @module hooks/use-audio-recorder
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const isCancelledRef = useRef(false)

  /**
   * 释放麦克风资源
   */
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  /**
   * 开始录音
   *
   * 请求麦克风权限并开始录音。
   * 如果已有活跃的麦克风连接，会复用该连接。
   *
   * @throws {Error} 麦克风权限被拒绝或不支持
   */
  const startRecording = useCallback(async () => {
    try {
      // 如果没有活跃的 stream，请求麦克风权限
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm',
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      isCancelledRef.current = false

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // 如果是取消操作，不生成 audioBlob
        if (isCancelledRef.current) {
          chunksRef.current = []
          return
        }

        // 正常停止：生成音频 Blob
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          setAudioBlob(blob)
        }
      }

      mediaRecorder.start(100)
      setIsRecording(true)
    } catch (error) {
      releaseStream()
      throw error
    }
  }, [releaseStream])

  /**
   * 停止录音
   *
   * 停止录音并生成音频 Blob，但保持麦克风连接（方便再次录音）。
   * 录音结果会自动保存到 audioBlob 状态中。
   */
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
      setIsRecording(false)
    }
  }, [])

  /**
   * 取消录音
   *
   * 取消当前录音，清空数据，并立即释放麦克风资源。
   * 不会生成 audioBlob。
   */
  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }

    setAudioBlob(null)
    chunksRef.current = []
    setIsRecording(false)

    releaseStream()
  }, [releaseStream])

  /**
   * 清空录音数据
   *
   * 清除当前的音频 Blob，但不影响麦克风连接。
   */
  const clearAudio = useCallback(() => {
    setAudioBlob(null)
    chunksRef.current = []
  }, [])

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state === 'recording') {
        recorder.stop()
      }
      releaseStream()
    }
  }, [releaseStream])

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
  }
}

