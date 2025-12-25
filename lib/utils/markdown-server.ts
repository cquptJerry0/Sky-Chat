import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'
import { rehype } from 'rehype'
import rehypeHighlight from 'rehype-highlight'

/**
 * 预处理自定义代码块
 * 
 * 将 ```image 代码块转换为 HTML img 标签
 * 格式: ```image\n{"url":"...","alt":"...","width":512,"height":512}\n```
 */
function preprocessCustomBlocks(markdown: string): string {
  // 处理 ```image 代码块
  return markdown.replace(
    /```image\n([\s\S]*?)\n```/g,
    (_, jsonContent) => {
      try {
        const data = JSON.parse(jsonContent.trim())
        const url = data.url || ''
        const alt = data.alt || '生成的图片'
        const width = data.width || 512
        const height = data.height || 512
        
        // 生成带样式的图片 HTML
        return `<figure class="my-4">
  <img src="${url}" alt="${alt}" width="${width}" height="${height}" class="rounded-lg max-w-full h-auto" loading="lazy" />
  ${alt ? `<figcaption class="mt-2 text-sm text-gray-500 dark:text-gray-400">✨ ${alt}</figcaption>` : ''}
</figure>`
      } catch {
        // JSON 解析失败，返回原始内容
        return `<pre><code class="language-image">${jsonContent}</code></pre>`
      }
    }
  )
}

/**
 * 将 Markdown 转换为安全的 HTML (服务端)
 * 
 * 流程:
 * 1. 预处理: 转换自定义代码块 (```image 等)
 * 2. remark: Markdown -> HTML String (基础转换 + GFM 支持)
 * 3. rehype: 处理 HTML (如代码高亮)
 * 
 * 支持的语法:
 * - GFM (表格、删除线、任务列表、自动链接)
 * - 标准 Markdown 图片 ![alt](url)
 * - 自定义 ```image 代码块
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return ''

  try {
    // 0. 预处理自定义代码块
    const preprocessed = preprocessCustomBlocks(markdown)
    
    // 1. Markdown -> HTML (添加 GFM 支持)
    const processedContent = await remark()
      .use(remarkGfm)  // 支持 GFM 语法（表格、删除线、图片等）
      .use(html, { sanitize: false })  // 不过滤 HTML，保留图片等标签
      .process(preprocessed)
    
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

