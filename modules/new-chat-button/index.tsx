
'use client'

/**
 * New Chat Button Module - 新建对话按钮模块
 * 
 * Container Component（容器组件）
 * 零props设计，所有逻辑自包含
 * 
 * @module modules/new-chat-button
 */

import * as React from 'react'
import { PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/lib/stores/chat.store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * 新建对话按钮模块
 * 
 * 零props设计，点击时创建新会话并切换
 */
export function NewChatButton() {
  const createNewConversation = useChatStore((s) => s.createNewConversation)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-[hsl(var(--sidebar-hover))] dark:hover:bg-[hsl(var(--sidebar-hover))]"
        >
          <PenSquare className="h-4 w-4" />
          <span>新建对话</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
            开始新对话？
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
            将创建一个新对话并切换到该对话。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={createNewConversation}
            className="bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            确定
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

