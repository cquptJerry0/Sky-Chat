'use client'

/**
 * Export Button Component
 * 导出按钮组件 - 支持单个或批量导出会话
 */

import * as React from 'react'
import {
  Download,
  FileText,
  FileJson,
  FileCode,
  FileType,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { exportService, type ExportConfig as FrontendExportConfig } from '@/lib/services/export'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  conversationId?: string
  conversationIds?: string[]
  variant?: 'default' | 'dropdown' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onExportComplete?: () => void
}

const formatIcons = {
  markdown: FileText,
  json: FileJson,
  txt: FileType,
  html: FileCode,
  pdf: FileText,
}

const formatLabels = {
  markdown: 'Markdown (.md)',
  json: 'JSON (.json)',
  txt: '纯文本 (.txt)',
  html: 'HTML (.html)',
  pdf: 'PDF (.pdf)',
}

export function ExportButton({
  conversationId,
  conversationIds,
  variant = 'default',
  size = 'default',
  className,
  onExportComplete
}: ExportButtonProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [exportConfig, setExportConfig] = React.useState<{
    format: 'markdown' | 'json' | 'txt' | 'html' | 'pdf'
    includeThinking: boolean
    includeMetadata: boolean
  }>({
    format: 'markdown',
    includeThinking: false,
    includeMetadata: true,
  })

  const isBatch = !conversationId && conversationIds && conversationIds.length > 0
  const isExportAll = !conversationId && !conversationIds

  const handleExport = async (format?: 'markdown' | 'json' | 'txt' | 'html' | 'pdf') => {
    setIsLoading(true)
    
    const config = format ? { ...exportConfig, format } : exportConfig
    
    try {
      if (conversationId) {
        // 单个导出 - 使用前端exportService（支持markdown和pdf）
        if (config.format === 'markdown' || config.format === 'pdf') {
          await exportService.exportConversation(conversationId, {
            format: config.format,
            includeThinking: config.includeThinking,
            includeMetadata: config.includeMetadata
          } as FrontendExportConfig)
        } else {
          // 其他格式使用后端API
          const params = new URLSearchParams({
            format: config.format,
            includeThinking: String(config.includeThinking),
            includeMetadata: String(config.includeMetadata)
          })
          const response = await fetch(`/api/conversations/${conversationId}/export?${params}`)
          if (!response.ok) throw new Error('导出失败')
          
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = response.headers.get('Content-Disposition')?.split('filename="')[1]?.split('"')[0] || 'export'
          link.click()
          URL.revokeObjectURL(url)
        }
        toast({
          title: '导出成功',
          description: `会话已导出为 ${config.format.toUpperCase()} 格式`,
        })
      } else {
        // 批量导出或导出全部 - 使用后端API
        const response = await fetch('/api/conversations/batch-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationIds: isBatch ? conversationIds : undefined,
            format: config.format,
            includeThinking: config.includeThinking,
            includeMetadata: config.includeMetadata
          })
        })
        
        if (!response.ok) throw new Error('导出失败')
        
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = response.headers.get('Content-Disposition')?.split('filename="')[1]?.split('"')[0] || 'export'
        link.click()
        URL.revokeObjectURL(url)
        
        toast({
          title: isBatch ? '批量导出成功' : '导出成功',
          description: isBatch ? `${conversationIds!.length} 个会话已导出` : '所有会话已导出',
        })
      }
      
      onExportComplete?.()
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: '导出失败',
        description: error instanceof Error ? error.message : '导出过程中出现错误',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setShowAdvanced(false)
    }
  }

  const handleQuickExport = (format: 'markdown' | 'json' | 'txt' | 'html' | 'pdf') => {
    handleExport(format)
  }

  // 图标模式
  if (variant === 'icon') {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={() => handleExport()}
        disabled={isLoading}
        className={className}
      >
        <Download className="h-4 w-4" />
      </Button>
    )
  }

  // 下拉菜单模式
  if (variant === 'dropdown') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size={size}
              disabled={isLoading}
              className={cn('gap-2', className)}
            >
              <Download className="h-4 w-4" />
              导出
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>选择导出格式</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(formatLabels).map(([format, label]) => {
              const Icon = formatIcons[format as keyof typeof formatIcons]
              return (
                <DropdownMenuItem
                  key={format}
                  onClick={() => handleQuickExport(format as 'markdown' | 'json' | 'txt' | 'html' | 'pdf')}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowAdvanced(true)}>
              ⚙️ 高级选项...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 高级选项对话框 */}
        <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>导出选项</DialogTitle>
              <DialogDescription>
                配置导出格式和内容选项
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* 格式选择 */}
              <div className="grid gap-2">
                <Label>导出格式</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(formatLabels).map(([format, label]) => {
                    const Icon = formatIcons[format as keyof typeof formatIcons]
                    return (
                      <Button
                        key={format}
                        variant={exportConfig.format === format ? 'default' : 'outline'}
                        size="sm"
                        className="justify-start"
                        onClick={() => setExportConfig(prev => ({ ...prev, format: format as 'markdown' | 'json' | 'txt' | 'html' | 'pdf' }))}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {label.split(' ')[0]}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* 内容选项 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="thinking">包含思考过程</Label>
                  <Switch
                    id="thinking"
                    checked={exportConfig.includeThinking}
                    onCheckedChange={(checked: boolean) =>
                      setExportConfig(prev => ({ ...prev, includeThinking: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="metadata">包含元数据</Label>
                  <Switch
                    id="metadata"
                    checked={exportConfig.includeMetadata}
                    onCheckedChange={(checked: boolean) =>
                      setExportConfig(prev => ({ ...prev, includeMetadata: checked }))
                    }
                  />
                </div>
              </div>

              {/* 日期范围（可选） */}
              {/* TODO: 实现日期选择器 */}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdvanced(false)}>
                取消
              </Button>
              <Button onClick={() => handleExport()} disabled={isLoading}>
                {isLoading ? '导出中...' : '导出'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // 默认按钮模式
  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => handleExport()}
      disabled={isLoading}
      className={cn('gap-2', className)}
    >
      <Download className="h-4 w-4" />
      {isLoading ? '导出中...' : isBatch ? `导出 ${conversationIds?.length} 个会话` : isExportAll ? '导出全部' : '导出'}
    </Button>
  )
}
