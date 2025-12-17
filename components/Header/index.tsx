'use client'

import * as React from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Info, UserCircle2, LogOut, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/features/chat/components/ModelSelector'
import { useChatStore } from '@/features/chat/store/chat.store'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { StorageManager } from '@/lib/utils/storage'
import { ShareButton } from '@/features/share/components/ShareButton'
import { ExportButton } from '@/components/ExportButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function Header() {
  const params = useParams()
  const conversationId = params.conversationId as string | undefined
  
  const selectedModel = useChatStore((s) => s.selectedModel)
  const setModel = useChatStore((s) => s.setModel)
  const reset = useChatStore((s) => s.reset)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [aboutDialogOpen, setAboutDialogOpen] = React.useState(false)

  const handleLogout = async () => {

    StorageManager.clearUserData()

    reset()

    await signOut({ callbackUrl: '/' })
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
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
        {conversationId && (
          <ExportButton
            conversationId={conversationId}
            className="h-9"
          />
        )}

        {/* 当前会话分享按钮 - 仅当有会话时显示 */}
        {conversationId && (
          <ShareButton
            conversationId={conversationId}
            className="h-9"
          />
        )}

        {/* 关于按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAboutDialogOpen(true)}
          className="h-9 w-9 rounded-lg hover:bg-[hsl(var(--sidebar-hover))]"
          title="关于"
        >
          <Info className="h-4 w-4" />
        </Button>

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

      {/* 关于对话框 */}
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>关于 Sky Chat</DialogTitle>
            <DialogDescription>
              一个基于硅基流动 API 的智能对话应用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">版本信息</h4>
              <p className="text-sm text-muted-foreground">
                版本: 1.0.0
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">功能特性</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 支持多种 AI 模型</li>
                <li>• 思考模式（Reasoning）</li>
                <li>• 语音输入与合成</li>
                <li>• 会话分享与导出</li>
                <li>• OAuth 登录（GitHub/Google）</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">技术栈</h4>
              <p className="text-sm text-muted-foreground">
                Next.js 16 • React 19 • TypeScript • Prisma • PostgreSQL
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}

