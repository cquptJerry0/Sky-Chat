'use client'

/**
 * 图片块组件
 *
 * 展示图片，支持下载、复制、放大操作
 * 图片生成在后端完成，前端只负责展示
 */

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Download, Copy, ZoomIn, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import type { MediaBlockProps } from './registry'

interface ImageData {
  url?: string
  generate?: boolean
  prompt?: string
  alt?: string
  width?: number
  height?: number
}

export function ImageBlock({ data, isStreaming }: MediaBlockProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { toast } = useToast()

  const imageData = useMemo(() => {
    const trimmed = data.trim()
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as ImageData
      } catch {
        return null
      }
    }
    if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
      return { url: trimmed } as ImageData
    }
    return null
  }, [data])

  // 下载图片
  const handleDownload = async () => {
    if (!imageData?.url) return
    try {
      const response = await fetch(imageData.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: '下载成功' })
    } catch {
      toast({ title: '下载失败', variant: 'destructive' })
    }
  }

  // 复制链接
  const handleCopy = async () => {
    if (!imageData?.url) return
    const fullUrl = imageData.url.startsWith('/')
      ? `${window.location.origin}${imageData.url}`
      : imageData.url
    await navigator.clipboard.writeText(fullUrl)
    toast({ title: '链接已复制' })
  }

  // 放大查看
  const handleZoom = () => {
    if (!imageData?.url) return
    window.open(imageData.url, '_blank')
  }

  // 流式传输中或解析失败
  if (!imageData) {
    if (isStreaming) {
      return <div className="my-4 aspect-square animate-pulse bg-muted" />
    }
    return (
      <div className="my-4 bg-destructive/10 p-4 text-sm text-destructive">
        无法解析图片数据
      </div>
    )
  }

  // 正在生成中（后端还没处理完）
  if (imageData.generate && !imageData.url) {
    return (
      <div className="my-4">
        <div className="aspect-square bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Sparkles className="h-10 w-10 text-violet-500 animate-pulse" />
            <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 text-purple-500 animate-spin" />
          </div>
          <p className="text-sm text-violet-700 dark:text-violet-300">正在生成...</p>
        </div>
        {imageData.alt && (
          <p className="mt-2 text-sm text-muted-foreground">{imageData.alt}</p>
        )}
      </div>
    )
  }

  // 没有 URL
  if (!imageData.url) {
    return (
      <div className="my-4 bg-destructive/5 p-4 text-sm text-destructive">
        图片加载失败
      </div>
    )
  }

  // 加载失败
  if (hasError) {
    return (
      <div className="my-4 bg-destructive/5 p-4 text-sm text-destructive">
        图片加载失败
      </div>
    )
  }

  // 正常展示
  return (
    <div className="my-4">
      {/* 纯净的图片区域 */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <Image
          src={imageData.url}
          alt={imageData.alt || '生成的图片'}
          width={imageData.width || 512}
          height={imageData.height || 512}
          className={`w-full h-auto ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          unoptimized
        />
      </div>

      {/* 描述文字 */}
      {imageData.alt && (
        <p className="mt-3 text-sm text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {imageData.alt}
        </p>
      )}

      {/* 操作按钮 */}
      <div className="mt-2 flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 px-2 text-xs">
          <Download className="mr-1 h-3 w-3" />
          下载
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-xs">
          <Copy className="mr-1 h-3 w-3" />
          复制
        </Button>
        <Button size="sm" variant="ghost" onClick={handleZoom} className="h-7 px-2 text-xs">
          <ZoomIn className="mr-1 h-3 w-3" />
          放大
        </Button>
      </div>
    </div>
  )
}
