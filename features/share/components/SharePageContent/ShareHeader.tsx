/**
 * 分享页面头部组件
 * 
 * Hydration Mismatch 处理：
 * - 时间戳使用 useClientValue 延迟渲染，避免 SSR/CSR 时区差异导致的不一致
 * - 相对时间（"3 天前"）延迟计算，避免 SSR/CSR 时间点差异
 */

'use client'

import { Calendar, Eye, User, Clock } from 'lucide-react'
import { useClientValue } from '@/features/share/hooks/use-client-value'

interface ShareHeaderProps {
  conversation: {
    id: string
    title: string
    author: string
    sharedAt: string
    viewCount?: number
  }
}

/**
 * 格式化分享日期
 * 仅在客户端调用，避免 SSR/CSR 时区差异
 */
function formatSharedDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 计算相对时间（"3 天前"）
 * 仅在客户端调用，避免 SSR/CSR 时间点差异
 */
function getRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

export function ShareHeader({ conversation }: ShareHeaderProps) {
  // Hydration Mismatch 处理：时间戳延迟至 useEffect 阶段渲染
  // SSR 阶段显示 ISO 日期部分，CSR 阶段显示本地化日期
  const sharedDate = useClientValue(
    () => formatSharedDate(conversation.sharedAt),
    conversation.sharedAt.split('T')[0]
  )
  
  // Hydration Mismatch 处理：相对时间延迟计算
  // SSR 阶段显示空字符串，CSR 阶段显示 "3 天前"
  const relativeTime = useClientValue(
    () => getRelativeTime(conversation.sharedAt),
    ''
  )
  
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
          
          {/* 相对时间 - 客户端渲染后显示 */}
          {relativeTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{relativeTime}</span>
            </div>
          )}
          
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
