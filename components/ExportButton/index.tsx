'use client'

/**
 * 导出按钮组件（调用后端 API）
 * 
 * 简化版本，直接调用后端导出 API
 */

import * as React from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/lib/hooks/use-toast'

interface ExportButtonProps {
  conversationId?: string
  className?: string
}

export function ExportButton({ conversationId, className }: ExportButtonProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async (format: 'markdown') => {
    if (isExporting) return
    if (!conversationId) {
      toast({
        title: '无法导出',
        description: '请先选择一个会话',
        variant: 'destructive',
      })
      return
    }

    setIsExporting(true)

    try {
      // 调用后端 API
      const url = `/api/export/${conversationId}?format=${format}&includeThinking=true&includeMetadata=false`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // 下载文件
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `conversation-${conversationId}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

      toast({
        title: '导出成功',
        description: `会话已导出为 ${format.toUpperCase()} 格式`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: '导出失败',
        description: error instanceof Error ? error.message : '导出过程中出现错误',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? '导出中...' : '导出'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
        >
          导出为 Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

