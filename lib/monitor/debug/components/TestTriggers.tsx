/**
 * 测试触发器组件
 */

'use client'

import { Settings2, AlertCircle, Globe, Zap } from 'lucide-react'

// ShadcnUI 组件
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function TestTriggers() {
  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings2 className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>测试工具</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs">错误测试</DropdownMenuLabel>
          <DropdownMenuItem onClick={triggerTestError} className="text-xs">
            <AlertCircle className="w-3 h-3 mr-2 text-red-500" />
            触发 JS 错误
          </DropdownMenuItem>
          <DropdownMenuItem onClick={triggerPromiseError} className="text-xs">
            <AlertCircle className="w-3 h-3 mr-2 text-orange-500" />
            触发 Promise 错误
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs">网络测试</DropdownMenuLabel>
          <DropdownMenuItem onClick={triggerTestRequest} className="text-xs">
            <Globe className="w-3 h-3 mr-2 text-blue-500" />
            触发测试请求
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs">自定义事件</DropdownMenuLabel>
          <DropdownMenuItem onClick={triggerCustomEvent} className="text-xs">
            <Zap className="w-3 h-3 mr-2 text-green-500" />
            发送自定义事件
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}

/** 触发测试 JS 错误 */
function triggerTestError(): void {
  setTimeout(() => {
    throw new Error('[Test] 这是一个测试错误')
  }, 0)
}

/** 触发测试 Promise 错误 */
function triggerPromiseError(): void {
  Promise.reject(new Error('[Test] 这是一个 Promise 错误'))
}

/** 触发测试 HTTP 请求 */
function triggerTestRequest(): void {
  fetch('/api/test-debug-panel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true, timestamp: Date.now() }),
  }).catch(() => {
    // 预期会失败，用于测试错误请求
  })
}

/** 触发自定义事件 */
function triggerCustomEvent(): void {
  const debugPlugin = (window as unknown as { __SKY_MONITOR_DEBUG__?: { track?: (type: string, data: Record<string, unknown>) => void } }).__SKY_MONITOR_DEBUG__
  if (debugPlugin?.track) {
    debugPlugin.track('custom_test', {
      message: '这是一个自定义测试事件',
      timestamp: Date.now(),
    })
  }
}
