'use client'

/**
 * 导出按钮组件（调用后端 API）
 *
 * 直接点击导出为 Markdown
 */

import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'

interface ExportButtonProps {
  conversationId?: string
  className?: string
}

export function ExportButton({ conversationId, className }: ExportButtonProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
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
      // 调用后端 API，直接导出为 Markdown
      const url = `/api/export/${conversationId}?format=markdown&includeThinking=true&includeMetadata=false`
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
        description: '会话已导出为 Markdown 格式',
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
    <Button
      variant="outline"
      size="sm"
      className={className}
      disabled={isExporting}
      onClick={handleExport}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? '导出中...' : '导出'}
    </Button>
  )
}

