import { CodeBlock } from './CodeBlock'
import type { Components } from 'react-markdown'

export const markdownComponents: Components = {
  code: ({ className, children, ...props }) => {
    const isInline = !className
    return (
      <CodeBlock inline={isInline} className={className} {...props}>
        {children}
      </CodeBlock>
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
