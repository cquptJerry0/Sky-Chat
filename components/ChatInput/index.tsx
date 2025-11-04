'use client'

import * as React from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatInputProps = {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  return (
    <div className="bg-background pb-6 pt-4">
      <div className="mx-auto max-w-3xl px-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="给 Sky Chat 发送消息"
            disabled={disabled}
            className={cn(
              'w-full rounded-3xl border border-input bg-background px-5 py-4 pr-12 text-sm shadow-sm transition-colors',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              input.trim() && !disabled
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <ArrowUp className="h-5 w-5" />
            <span className="sr-only">发送</span>
          </button>
        </form>
      </div>
    </div>
  )
}
