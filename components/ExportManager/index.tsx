'use client'

/**
 * Export Manager Component
 * 数据导出管理器 - 提供批量导出和高级导出选项
 */

import * as React from 'react'
import {
  Download,
  Archive,
  Calendar,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { exportManager, type BatchExportConfig } from '@/lib/services/export-manager'
import { useToast } from '@/hooks/use-toast'
import { useChatStore } from '@/lib/stores/chat.store'
import type { Conversation } from '@/lib/services/conversation-api'

interface ExportManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportManagerDialog({ open, onOpenChange }: ExportManagerProps) {
  const { toast } = useToast()
  const conversations = useChatStore(s => s.conversations)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [exportConfig, setExportConfig] = React.useState<BatchExportConfig>({
    format: 'json',
    includeThinking: false,
    includeMetadata: true,
  })
  const [isExporting, setIsExporting] = React.useState(false)

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === conversations.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(conversations.map(c => c.id))
    }
  }

  // 切换单个选择
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  // 执行导出
  const handleExport = async (exportAll = false) => {
    setIsExporting(true)
    
    try {
      if (exportAll) {
        // 导出所有
        await exportManager.exportAll(exportConfig)
        toast({
          title: '导出成功',
          description: '所有会话已成功导出',
        })
      } else if (selectedIds.length > 0) {
        // 导出选中的
        await exportManager.exportBatch({
          ...exportConfig,
          conversationIds: selectedIds
        })
        toast({
          title: '导出成功',
          description: `${selectedIds.length} 个会话已成功导出`,
        })
      } else {
        toast({
          title: '请选择会话',
          description: '请至少选择一个会话进行导出',
          variant: 'destructive',
        })
        return
      }
      
      onOpenChange(false)
      setSelectedIds([])
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: '导出失败',
        description: '导出过程中出现错误',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>数据导出管理</DialogTitle>
          <DialogDescription>
            选择要导出的会话，或导出全部聊天记录
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* 快捷操作 */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="gap-2"
            >
              {selectedIds.length === conversations.length ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  取消全选
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  全选
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                已选择 {selectedIds.length} / {conversations.length}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* 会话列表 */}
          <div className="space-y-2 mt-4">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无会话记录
              </div>
            ) : (
              conversations.map(conversation => (
                <ConversationSelectItem
                  key={conversation.id}
                  conversation={conversation}
                  selected={selectedIds.includes(conversation.id)}
                  onToggle={() => toggleSelect(conversation.id)}
                />
              ))
            )}
          </div>

          {/* 导出格式选择 */}
          <div className="mt-6 space-y-4">
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">导出格式</h4>
              <div className="grid grid-cols-3 gap-2">
                {['json', 'markdown', 'txt', 'html'].map(format => (
                  <Button
                    key={format}
                    variant={exportConfig.format === format ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportConfig(prev => ({
                      ...prev,
                      format: format as BatchExportConfig['format']
                    }))}
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport(true)}
            disabled={isExporting}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            导出全部
          </Button>
          <Button
            onClick={() => handleExport(false)}
            disabled={isExporting || selectedIds.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? '导出中...' : `导出选中 (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 会话选择项组件
function ConversationSelectItem({
  conversation,
  selected,
  onToggle
}: {
  conversation: Conversation
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div className="flex-shrink-0">
        {selected ? (
          <CheckSquare className="h-5 w-5 text-primary" />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conversation.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
          {conversation._count?.messages && (
            <>
              <span>•</span>
              <span>{conversation._count.messages} 条消息</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
