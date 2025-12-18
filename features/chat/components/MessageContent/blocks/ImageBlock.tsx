'use client'

/**
 * 图片块组件
 *
 * 展示图片，支持下载、复制、放大操作
 */

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Download, Copy, ZoomIn, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogPortal, DialogOverlay, DialogClose } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/lib/hooks/use-toast'
import type { MediaBlockProps } from './registry'

interface ImageData {
  url?: string
  alt?: string
  width?: number
  height?: number
}

export function ImageBlock({ data, isStreaming }: MediaBlockProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
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

  // 流式传输中或解析失败
  if (!imageData) {
    if (isStreaming) {
      return <figure className="my-4 aspect-square animate-pulse bg-muted rounded-lg" />
    }
    return (
      <figure className="my-4 bg-destructive/10 p-4 text-sm text-destructive rounded-lg">
        无法解析图片数据
      </figure>
    )
  }

  // 没有 URL
  if (!imageData.url) {
    return (
      <figure className="my-4 bg-destructive/5 p-4 text-sm text-destructive rounded-lg">
        图片加载失败
      </figure>
    )
    }

    // 加载失败
    if (hasError) {
      return (
        <figure className="my-4 bg-destructive/5 p-4 text-sm text-destructive rounded-lg">
          图片加载失败
        </figure>
      )
    }

    // 计算宽高比，用于占位防抖
    const width = imageData.width || 512
    const height = imageData.height || 512
    const aspectRatio = width / height

  return (
    <>
      <figure className="my-4">
        {/* 图片区域 */}
        <span
          className="relative block overflow-hidden rounded-lg"
          style={{ aspectRatio, maxWidth: width }}
        >
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </span>
          )}
          <Image
            src={imageData.url}
            alt={imageData.alt || '生成的图片'}
            width={width}
            height={height}
            className={`w-full h-auto rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
            unoptimized
          />
        </span>

        {/* 描述文字 - 单行省略，hover 显示完整 */}
        {imageData.alt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <figcaption className="mt-2 text-sm text-muted-foreground flex items-start gap-1.5 cursor-default">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="truncate">{imageData.alt}</span>
              </figcaption>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p>{imageData.alt}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 操作按钮 */}
        <span className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-7 px-2 text-xs text-foreground/70 hover:text-foreground"
          >
            <Download className="mr-1 h-3 w-3" />
            下载
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-foreground/70 hover:text-foreground"
          >
            <Copy className="mr-1 h-3 w-3" />
            复制
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsZoomed(true)}
            className="h-7 px-2 text-xs text-foreground/70 hover:text-foreground"
          >
            <ZoomIn className="mr-1 h-3 w-3" />
            放大
          </Button>
        </span>
      </figure>

      {/* Lightbox 放大预览 */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <DialogClose className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <ZoomIn className="h-5 w-5 rotate-45" />
              <span className="sr-only">关闭</span>
            </DialogClose>
            <Image
              src={imageData.url}
              alt={imageData.alt || '生成的图片'}
              width={width}
              height={height}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              unoptimized
            />
          </div>
        </DialogPortal>
      </Dialog>
    </>
  )
}
