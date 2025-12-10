import { remark } from 'remark'
import html from 'remark-html'
import { rehype } from 'rehype'
import rehypeHighlight from 'rehype-highlight'

/**
 * 将 Markdown 转换为安全的 HTML (服务端)
 * 
 * 流程:
 * 1. remark: Markdown -> HTML String (基础转换)
 * 2. rehype: 处理 HTML (如代码高亮)
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return ''

  try {
    // 1. Markdown -> HTML
    const processedContent = await remark()
      .use(html)
      .process(markdown)
    
    const  contentHtml = processedContent.toString()

    // 2. 代码高亮处理 (可选，如果 remark-html 输出的结构需要进一步处理)
    // 注意：remark-html 生成的 <pre><code>...</code></pre> 结构通常可以直接配合 highlight.js 样式使用
    // 这里我们使用 rehype-highlight 来注入 class
    
    const file = await rehype()
      .data('settings', { fragment: true })
      .use(rehypeHighlight)
      .process(contentHtml)
    
    return file.toString()
  } catch (error) {
    console.error('Markdown rendering error:', error)
    // 降级处理：返回原始内容或转义后的文本
    return markdown
  }
}

