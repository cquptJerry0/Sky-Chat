/**
 * 网络请求 Tab
 */

'use client'

import { useDebugStore } from '../store'

// ShadcnUI 组件
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export function NetworkTab() {
  const { requests } = useDebugStore()

  const successCount = requests.filter(r => r.status >= 200 && r.status < 400).length
  const failCount = requests.filter(r => r.status === 0 || r.status >= 400).length

  return (
    <div className="flex flex-col h-full">
      {/* 统计 */}
      <div className="flex items-center gap-3 p-3 border-b text-xs">
        <span className="text-muted-foreground">
          总计: <span className="text-foreground">{requests.length}</span>
        </span>
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
          成功 {successCount}
        </Badge>
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
          失败 {failCount}
        </Badge>
      </div>

      {/* 请求列表 */}
      <ScrollArea className="flex-1">
        {requests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
            暂无请求
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-2 px-3 py-2 border-b hover:bg-muted/50"
            >
              {/* 状态码 */}
              <span className={`w-10 text-xs font-mono ${getStatusColor(req.status)}`}>
                {req.status || 'ERR'}
              </span>

              {/* 方法 */}
              <Badge variant="outline" className={`text-xs ${getMethodBadgeClass(req.method)}`}>
                {req.method}
              </Badge>

              {/* URL */}
              <span
                className="flex-1 text-xs truncate"
                title={req.url || '-'}
              >
                {getUrlPath(req.url)}
              </span>

              {/* 耗时 */}
              <span className={`text-xs ${getDurationColor(req.duration)}`}>
                {req.duration}ms
              </span>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}

/** 获取状态码颜色 */
function getStatusColor(status: number): string {
  if (status === 0) return 'text-red-500'
  if (status >= 200 && status < 300) return 'text-green-500'
  if (status >= 300 && status < 400) return 'text-yellow-500'
  return 'text-red-500'
}

/** 获取方法 Badge 样式 */
function getMethodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-blue-500/10 text-blue-500 border-blue-500/30'
    case 'POST': return 'bg-green-500/10 text-green-500 border-green-500/30'
    case 'PUT': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
    case 'DELETE': return 'bg-red-500/10 text-red-500 border-red-500/30'
    default: return ''
  }
}

/** 获取耗时颜色 */
function getDurationColor(duration: number): string {
  if (duration < 200) return 'text-green-500'
  if (duration < 1000) return 'text-yellow-500'
  return 'text-red-500'
}

/** 获取 URL 路径 */
function getUrlPath(url: string): string {
  if (!url) return '-'
  try {
    const u = new URL(url, window.location.origin)
    return u.pathname + u.search
  } catch {
    // URL 解析失败，返回原始值
    return url || '-'
  }
}
