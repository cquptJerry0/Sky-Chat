'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { markdownComponents } from './MarkdownComponents'

interface MessageContentProps {
  content: string
  isStreaming?: boolean
}

export function MessageContent({
  content,
  isStreaming,
}: MessageContentProps) {
  const contentWithCursor = isStreaming ? `${content}<cursor/>` : content

  const customComponents = {
    ...markdownComponents,
    cursor: () => (
      <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground ml-0.5" />
    ),
  } as Components

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={customComponents}
      >
        {contentWithCursor}
      </ReactMarkdown>
    </div>
  )
}

