'use client'

/**
 * Conversation Search Component - 会话搜索组件
 * 
 * 零props设计，搜索状态由store管理
 * 
 * @module components/ConversationSearch
 */

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConversationStore } from '@/features/conversation/store/conversation-store'

/**
 * 会话搜索组件
 *
 * 提供实时搜索功能，过滤会话列表
 */
export function ConversationSearch() {
  const searchQuery = useConversationStore((s) => s.searchQuery)
  const setSearchQuery = useConversationStore((s) => s.setSearchQuery)
  const filteredConversations = useConversationStore((s) => s.filteredConversations)
  
  const handleClear = () => {
    setSearchQuery('')
  }
  
  return (
    <div className="relative mb-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索对话..."
          className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {searchQuery && (
        <p className="text-xs text-muted-foreground mt-2 px-1">
          找到 {filteredConversations.length} 个对话
        </p>
      )}
    </div>
  )
}

