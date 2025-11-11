/**
 * 分享页面头部组件
 */

import { Calendar, Eye, User } from 'lucide-react'

interface ShareHeaderProps {
  conversation: {
    title: string
    author: string
    sharedAt: string
    viewCount?: number
  }
}

export function ShareHeader({ conversation }: ShareHeaderProps) {
  const sharedDate = new Date(conversation.sharedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-4xl px-4 py-4">
        {/* 标题部分 */}
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-foreground">
            {conversation.title}
          </h1>
        </div>
        
        {/* 元信息 */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{conversation.author}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>分享于 {sharedDate}</span>
          </div>
          
          {conversation.viewCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span>{conversation.viewCount} 次查看</span>
            </div>
          )}
          
          <div className="ml-auto">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              只读模式
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
