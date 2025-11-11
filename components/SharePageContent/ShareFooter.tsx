/**
 * 分享页面底部组件
 */

import { Github, Globe } from 'lucide-react'

export function ShareFooter() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* 左侧信息 */}
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              由 <span className="font-medium">Sky Chat</span> 提供支持
            </p>
            <p className="text-xs text-muted-foreground">
              这是一个只读分享页面，原始对话可能已更新
            </p>
          </div>
          
          {/* 右侧链接 */}
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe className="h-4 w-4" />
              <span>访问 Sky Chat</span>
            </a>
            
            <a
              href="https://github.com"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
