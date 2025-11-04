'use client'

import { CopyButton } from './CopyButton'

interface CodeBlockProps {
  inline?: boolean
  className?: string
  children: React.ReactNode
}

export function CodeBlock({ inline, className, children }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  if (inline) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
        {children}
      </code>
    )
  }

  return (
    <div className="group relative my-4">
      <div className="flex items-center justify-between rounded-t-lg bg-muted px-4 py-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {language || 'text'}
        </span>
        <CopyButton text={code} />
      </div>

      <pre className="!mt-0 overflow-x-auto rounded-b-lg bg-muted p-4">
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

