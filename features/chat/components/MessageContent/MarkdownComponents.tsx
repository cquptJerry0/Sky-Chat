import { Suspense } from 'react'
import { CodeBlock } from './CodeBlock'
import { isMediaBlock, mediaRegistry } from './blocks/registry'
import { ImageBlock } from './blocks/ImageBlock'
import type { Components } from 'react-markdown'

/**
 * 创建 Markdown 组件映射
 * @param isStreaming 是否正在流式传输
 */
export function createMarkdownComponents(isStreaming: boolean = false): Components {
  return {
    code: ({ className, children }) => {
      // 提取语言标识
      const match = /language-(\w+)/.exec(className || '')
      const language = match?.[1] || ''
      const content = String(children).replace(/\n$/, '')

      // 检查是否是媒体块
      if (language && isMediaBlock(language)) {
        const MediaComponent = mediaRegistry[language]
        return (
          <Suspense fallback={<div className="my-4 h-32 animate-pulse rounded-lg bg-muted" />}>
            <MediaComponent data={content} isStreaming={isStreaming} />
          </Suspense>
        )
      }

      // 普通代码块
      const isInline = !className
      return (
        <CodeBlock inline={isInline} className={className}>
          {children}
        </CodeBlock>
      )
    },

    // 图片使用 ImageBlock 组件渲染，支持下载、复制、放大
    img: ({ src, alt }) => {
      if (!src) return null
      const data = JSON.stringify({ url: src, alt: alt || '' })
      return (
        <Suspense fallback={<div className="my-4 aspect-square animate-pulse bg-muted" />}>
          <ImageBlock data={data} isStreaming={isStreaming} />
        </Suspense>
      )
    },

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80"
      >
        {children}
      </a>
    ),

    ul: ({ children }) => <ul className="my-2 list-disc pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal pl-6">{children}</ol>,

    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 text-2xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-xl font-bold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
    ),

    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-primary pl-4 italic">
        {children}
      </blockquote>
    ),

    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="min-w-full border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-4 py-2">{children}</td>
    ),
  }
}
