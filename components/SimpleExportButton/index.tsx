'use client'

/**
 * 简洁的导出按钮组件
 * 仅支持 Markdown 和 PDF 导出
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
import { exportService, type ExportConfig } from '@/lib/services/export'
import { useToast } from '@/hooks/use-toast'

interface SimpleExportButtonProps {
  conversationId?: string
  className?: string
}

export function SimpleExportButton({ conversationId, className }: SimpleExportButtonProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = React.useState(false)
  
  const handleExport = async (format: 'markdown' | 'pdf') => {
    if (isExporting) return
    
    setIsExporting(true)
    const config: ExportConfig = {
      format,
      includeThinking: true,
      includeTimestamp: true,
      includeMetadata: false
    }
    
    try {
      if (conversationId) {
        await exportService.exportConversation(conversationId, config)
      } else {
        await exportService.exportCurrentConversation(config)
      }
      
      toast({
        title: '导出成功',
        description: `会话已导出为 ${format.toUpperCase()} 格式`
      })
    } catch (error) {
      console.error('导出失败:', error)
      toast({
        title: '导出失败',
        description: error instanceof Error ? error.message : '导出过程中出现错误',
        variant: 'destructive'
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
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          导出为 PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
