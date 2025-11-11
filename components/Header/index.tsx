'use client'

import * as React from 'react'
import Image from 'next/image'
import { Settings, MoreVertical, UserCircle2, LogOut, Palette, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/ModelSelector'
import { useChatStore } from '@/lib/stores/chat.store'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { StorageManager } from '@/lib/utils/storage'
import { ExportButton } from '@/components/ExportButton'
import { ExportManagerDialog } from '@/components/ExportManager'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

export function Header() {
  const selectedModel = useChatStore((s) => s.selectedModel)
  const setModel = useChatStore((s) => s.setModel)
  const reset = useChatStore((s) => s.reset)
  const currentConversationId = useChatStore((s) => s.currentConversationId)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [showExportManager, setShowExportManager] = React.useState(false)

  const handleLogout = async () => {
    console.log('[Header] Logging out, clearing all data...')
    
    // 1. 清空 localStorage 中所有应用数据
    StorageManager.clearAll()
    
    // 2. 重置 store 状态
    reset()
    
    // 3. 执行登出
    await signOut({ callbackUrl: '/' })
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }
  
  const handleClearHistory = () => {
    clearMessages()
    toast({
      title: '历史已清空',
      description: '当前会话的所有消息已清空',
    })
  }

  return (
    <header className="sticky top-0 z-10 h-[60px] flex items-center justify-between px-6 bg-background border-none">
      {/* 左侧：模型选择器 */}
      <div className="flex items-center gap-3">
        <ModelSelector value={selectedModel} onChange={setModel} />
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 当前会话导出按钮 - 仅当有会话时显示 */}
        {currentConversationId && (
          <ExportButton 
            conversationId={currentConversationId}
            variant="icon"
            className="h-9 w-9 rounded-lg"
          />
        )}

        {/* 设置按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-[hsl(var(--sidebar-hover))]"
        >
          <Settings className="h-4 w-4" />
        </Button>

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
            <DropdownMenuItem 
              onClick={() => setShowExportManager(true)}
              className="cursor-pointer"
            >
              <Archive className="mr-2 h-4 w-4" />
              <span>数据导出管理</span>
            </DropdownMenuItem>
            {currentConversationId && (
              <>
                <DropdownMenuItem 
                  onClick={handleClearHistory}
                  className="cursor-pointer"
                >
                  <span>清空当前会话</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <span>关于</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-[hsl(var(--sidebar-hover))] p-0 overflow-hidden"
            >
              {session?.user?.image ? (
                <Image 
                  src={session.user.image} 
                  alt={session.user.name || '用户'} 
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* 用户信息 */}
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name || '用户'}
                </p>
                {session?.user?.email && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            {/* 主题切换 */}
            <DropdownMenuItem onClick={cycleTheme} className="cursor-pointer">
              <Palette className="mr-2 h-4 w-4" />
              <span>
                主题: {theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}
              </span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* 退出登录 */}
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* 数据导出管理对话框 */}
      <ExportManagerDialog 
        open={showExportManager}
        onOpenChange={setShowExportManager}
      />
    </header>
  )
}

