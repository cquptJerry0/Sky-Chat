'use client'

import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useAudioPlayer } from '@/lib/hooks/use-audio-player'
import { cn } from '@/lib/utils'

interface AudioControlProps {
  text: string
  className?: string
}

export function AudioControl({ text, className }: AudioControlProps) {
  const { isPlaying, isGenerating, playText, toggle, stop } = useAudioPlayer()

  const handleClick = async () => {
    if (isPlaying) {
      stop()
    } else if (!isGenerating) {
      try {
        await playText(text)
      } catch (error) {
        console.error('Failed to play audio:', error)
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isGenerating}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        'hover:bg-muted',
        isGenerating && 'cursor-not-allowed opacity-50',
        className
      )}
      title={isPlaying ? '停止播放' : '朗读'}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  )
}

