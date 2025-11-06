'use client'

import * as React from 'react'
import { Settings, MoreVertical, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/ModelSelector'
import { useChatStore } from '@/lib/stores/chat.store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Header() {
  const selectedModel = useChatStore((s) => s.selectedModel)
  const setModel = useChatStore((s) => s.setModel)

  return (
    <header className="sticky top-0 z-10 h-[60px] flex items-center justify-between px-6 bg-background border-none">
      {/* 左侧：模型选择器 */}
      <div className="flex items-center gap-3">
        <ModelSelector value={selectedModel} onChange={setModel} />
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 设置按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-[hsl(var(--sidebar-hover))]"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* 主题切换 */}
        <ThemeToggle />

        {/* 更多选项 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-[hsl(var(--sidebar-hover))]"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>导出对话</DropdownMenuItem>
            <DropdownMenuItem>清空历史</DropdownMenuItem>
            <DropdownMenuItem>关于</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 用户头像 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-[hsl(var(--button-primary-bg))] hover:bg-[hsl(var(--button-primary-hover))] text-white"
        >
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

