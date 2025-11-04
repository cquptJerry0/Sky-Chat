'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChatAPI } from '@/lib/services/chat-api'

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioURLRef = useRef<string | null>(null)

  const playText = useCallback(async (text: string) => {
    setIsGenerating(true)

    try {
      const audioBlob = await ChatAPI.textToSpeech(text)

      if (audioURLRef.current) {
        URL.revokeObjectURL(audioURLRef.current)
      }

      const audioURL = URL.createObjectURL(audioBlob)
      audioURLRef.current = audioURL

      if (!audioRef.current) {
        audioRef.current = new Audio()
        audioRef.current.onplay = () => setIsPlaying(true)
        audioRef.current.onpause = () => setIsPlaying(false)
        audioRef.current.onended = () => setIsPlaying(false)
      }

      audioRef.current.src = audioURL
      await audioRef.current.play()
      setIsGenerating(false)
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsGenerating(false)
      throw error
    }
  }, [])

  const toggle = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }, [isPlaying])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

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
    playText,
    toggle,
    stop,
  }
}

