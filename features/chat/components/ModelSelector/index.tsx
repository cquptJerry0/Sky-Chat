'use client'

/**
 * 模型选择器组件
 * 
 * 提供 AI 模型选择功能，支持：
 * - 推理模型（支持思考模式）
 * - 对话模型（快速响应）
 * - 代码模型（代码生成）
 */

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CHAT_MODELS, MODEL_CATEGORY_NAMES } from '@/features/chat/constants/models'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  /** 当前选中的模型 ID */
  value: string
  /** 模型变化回调 */
  onChange: (modelId: string) => void
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * 模型选择器组件
 * 
 * @example
 * ```tsx
 * const [model, setModel] = useState('Qwen/Qwen2.5-7B-Instruct')
 * 
 * <ModelSelector value={model} onChange={setModel} />
 * ```
 */
export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const currentModel = CHAT_MODELS.find(m => m.id === value) || CHAT_MODELS[4]

  // 按类别分组
  const modelsByCategory = {
    reasoning: CHAT_MODELS.filter(m => m.category === 'reasoning'),
    chat: CHAT_MODELS.filter(m => m.category === 'chat'),
    code: CHAT_MODELS.filter(m => m.category === 'code'),
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            className
          )}
        >
          <span>模型: {currentModel.name}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-48 max-h-[30vh] overflow-y-auto bg-white dark:bg-gray-900 scrollbar-hide"
        align="start"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* 推理模型 */}
        {modelsByCategory.reasoning.length > 0 && (
          <>
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {MODEL_CATEGORY_NAMES.reasoning}
              <Badge variant="outline" className="text-xs">思考</Badge>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {modelsByCategory.reasoning.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => onChange(model.id)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    model.id === value && 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {model.name}
                    </span>
                  </div>
                  {model.id === value && <Check className="h-4 w-4 text-green-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* 对话模型 */}
        {modelsByCategory.chat.length > 0 && (
          <>
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
              {MODEL_CATEGORY_NAMES.chat}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {modelsByCategory.chat.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => onChange(model.id)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    model.id === value && 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {model.name}
                    </span>
                  </div>
                  {model.id === value && <Check className="h-4 w-4 text-green-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* 代码模型 */}
        {modelsByCategory.code.length > 0 && (
          <>
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
              {MODEL_CATEGORY_NAMES.code}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {modelsByCategory.code.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => onChange(model.id)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    model.id === value && 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {model.name}
                    </span>
                  </div>
                  {model.id === value && <Check className="h-4 w-4 text-green-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

