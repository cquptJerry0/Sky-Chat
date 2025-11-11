'use client'

/**
 * Sidebar Layout Component - 侧边栏布局组件
 * 
 * 只负责布局和容器，不包含业务逻辑
 * 会话列表等功能模块通过children注入
 * 
 * 布局结构：
 * - 顶部：Logo和品牌
 * - 中间：children（会话列表等模块）
 * - 底部：主标签页指示器
 */

import * as React from 'react'
import { MessageSquare, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/lib/stores/ui.store'
import { cn } from '@/lib/utils'

interface SidebarProps {
  /** 子组件（如会话列表模块） */
  children?: React.ReactNode
  /** 是否为主标签页 */
  isLeader?: boolean
  /** 额外的 CSS 类名 */
  className?: string
}

export function Sidebar({ children, isLeader, className }: SidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [displayText, setDisplayText] = React.useState('')
  const isFirstMount = React.useRef(true)
  
  // 打字机效果 - 只在首次加载或折叠状态变化时触发
  React.useEffect(() => {
    // 首次mount，如果是展开状态则显示打字机效果
    if (isFirstMount.current) {
      isFirstMount.current = false
      
      if (!collapsed) {
        // 首屏打字机效果
        const text = 'Sky Chat'
        let i = 0
        const delayTimer = setTimeout(() => {
          const typeTimer = setInterval(() => {
            if (i <= text.length) {
              setDisplayText(text.slice(0, i))
              i++
            } else {
              clearInterval(typeTimer)
            }
          }, 50)
          return () => clearInterval(typeTimer)
        }, 100)
        
        return () => {
          clearTimeout(delayTimer)
        }
      } else {
        // 首次就是折叠状态，不显示文字
        setDisplayText('')
      }
      return
    }
    
    // 非首次mount，处理折叠/展开切换
    if (!collapsed) {
      // 展开时：打字机效果
      const text = 'Sky Chat'
      let i = 0
      const delayTimer = setTimeout(() => {
        const typeTimer = setInterval(() => {
          if (i <= text.length) {
            setDisplayText(text.slice(0, i))
            i++
          } else {
            clearInterval(typeTimer)
          }
        }, 50)
        return () => clearInterval(typeTimer)
      }, 100)
      
      return () => {
        clearTimeout(delayTimer)
      }
    } else {
      // 折叠时：立即清空
      setDisplayText('')
    }
  }, [collapsed])
  
  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-[hsl(var(--sidebar-bg))] dark:bg-[hsl(var(--sidebar-bg))] transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* 顶部：Logo和折叠按钮 */}
      <div className="flex items-center justify-between p-3 px-4">
        {!collapsed ? (
          <>
            {/* 展开状态：Logo + 折叠按钮 */}
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 shrink-0" />
              <span className="font-semibold text-lg min-w-[80px]">
                {displayText}
                {displayText && displayText.length < 8 && (
                  <span className="animate-pulse">|</span>
                )}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 hover:bg-[hsl(var(--sidebar-hover))] shrink-0"
              title="折叠侧边栏"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {/* 折叠状态：仅Logo */}
            <div className="flex flex-col items-center gap-3 w-full">
              <MessageSquare className="h-5 w-5" />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-[hsl(var(--sidebar-hover))]"
                title="展开侧边栏"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 中间：动态内容（会话列表等模块） */}
      <div className={cn(
        "flex-1 overflow-y-auto px-3",
        collapsed && "hidden"
      )}>
        {children}
      </div>

      {/* 底部：主标签页指示器 */}
      <div className="p-3 mt-auto">
        {/* Leader 状态指示 */}
        {isLeader && (
          <Badge 
            variant="outline" 
            className={cn(
              "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 w-full justify-center",
              collapsed ? "px-1" : ""
            )}
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {!collapsed && <span className="ml-2">主标签页</span>}
          </Badge>
        )}
      </div>
    </aside>
  )
}

