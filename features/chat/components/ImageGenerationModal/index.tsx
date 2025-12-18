'use client'

/**
 * 图片生成配置弹窗
 * 
 * 用于配置图片生成参数：prompt、negative_prompt、image_size
 */

import { useState } from 'react'
import { Paintbrush, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * 图片配置
 */
export interface ImageConfig {
  prompt: string
  negative_prompt?: string
  image_size: string
}

interface ImageGenerationModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (config: ImageConfig) => void
}

/**
 * 支持的图片尺寸选项
 */
const IMAGE_SIZES = [
  { value: '1024x1024', label: '1:1', desc: '1024×1024' },
  { value: '768x1024', label: '3:4', desc: '768×1024' },
  { value: '1024x768', label: '4:3', desc: '1024×768' },
  { value: '576x1024', label: '9:16', desc: '576×1024' },
  { value: '1024x576', label: '16:9', desc: '1024×576' },
]

export function ImageGenerationModal({
  open,
  onClose,
  onGenerate,
}: ImageGenerationModalProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [imageSize, setImageSize] = useState('1024x1024')
  const [isGenerating, setIsGenerating] = useState(false)

  const canGenerate = prompt.trim().length > 0 && !isGenerating

  const handleGenerate = () => {
    if (!canGenerate) return
    
    setIsGenerating(true)
    onGenerate({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim() || undefined,
      image_size: imageSize,
    })
    
    // 重置状态
    setPrompt('')
    setNegativePrompt('')
    setImageSize('1024x1024')
    setIsGenerating(false)
  }

  const handleClose = () => {
    setPrompt('')
    setNegativePrompt('')
    setImageSize('1024x1024')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-violet-500" />
            生成图片
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prompt 输入 */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-sm font-medium">
              图片描述 <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              placeholder="描述你想要生成的图片，例如：一只可爱的猫咪在阳光下睡觉"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              提示：使用英文描述效果更好
            </p>
          </div>

          {/* Negative Prompt 输入 */}
          <div className="space-y-2">
            <Label htmlFor="negative-prompt" className="text-sm font-medium">
              排除内容 <span className="text-muted-foreground">(可选)</span>
            </Label>
            <Input
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="不希望出现的内容，例如：模糊、低质量"
            />
          </div>

          {/* 尺寸选择 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">图片尺寸</Label>
            <div className="grid grid-cols-5 gap-2">
              {IMAGE_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => setImageSize(size.value)}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all',
                    imageSize === size.value
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-border hover:border-violet-300 hover:bg-muted/50'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium',
                    imageSize === size.value ? 'text-violet-600 dark:text-violet-400' : ''
                  )}>
                    {size.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {size.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="bg-violet-500 hover:bg-violet-600"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            生成图片
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
