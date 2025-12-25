import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'
import { rehype } from 'rehype'
import rehypeHighlight from 'rehype-highlight'

/**
 * 预处理 ```image 代码块
 */
function preprocessImageBlock(markdown: string): string {
  return markdown.replace(
    /```image\n([\s\S]*?)\n```/g,
    (_, jsonContent) => {
      try {
        const data = JSON.parse(jsonContent.trim())
        const url = data.url || ''
        const alt = data.alt || '生成的图片'
        const width = data.width || 512
        const height = data.height || 512
        
        return `<figure class="my-4">
  <img src="${url}" alt="${alt}" width="${width}" height="${height}" class="rounded-lg max-w-full h-auto" loading="lazy" />
  ${alt ? `<figcaption class="mt-2 text-sm text-gray-500 dark:text-gray-400">✨ ${alt}</figcaption>` : ''}
</figure>`
      } catch {
        return `<pre><code class="language-image">${jsonContent}</code></pre>`
      }
    }
  )
}

/**
 * 预处理 ```weather 代码块
 */
function preprocessWeatherBlock(markdown: string): string {
  return markdown.replace(
    /```weather\n([\s\S]*?)\n```/g,
    (_, jsonContent) => {
      try {
        const data = JSON.parse(jsonContent.trim())
        const city = data.city || '未知城市'
        const temp = data.temp ?? '--'
        const condition = data.condition || '未知'
        const humidity = data.humidity
        const wind = data.wind
        
        return `<div class="my-4 overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
  <div class="p-4">
    <div class="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400">${city}</div>
    <div class="flex items-baseline gap-1">
      <span class="text-4xl font-bold text-blue-900 dark:text-blue-100">${temp}</span>
      <span class="text-xl text-blue-700 dark:text-blue-300">°C</span>
    </div>
    <div class="mt-2 text-lg text-blue-800 dark:text-blue-200">${condition}</div>
    <div class="mt-3 flex gap-4 text-sm text-blue-600 dark:text-blue-400">
      ${humidity !== undefined ? `<span>湿度 ${humidity}%</span>` : ''}
      ${wind ? `<span>${wind}</span>` : ''}
    </div>
  </div>
</div>`
      } catch {
        return `<pre><code class="language-weather">${jsonContent}</code></pre>`
      }
    }
  )
}

/**
 * 预处理 ```chart 代码块
 * 注意：图表在服务端渲染为静态表格，因为 recharts 需要客户端 JS
 */
function preprocessChartBlock(markdown: string): string {
  return markdown.replace(
    /```chart\n([\s\S]*?)\n```/g,
    (_, jsonContent) => {
      try {
        const data = JSON.parse(jsonContent.trim())
        const title = data.title || '图表'
        const labels = data.labels || []
        const values = data.values || []
        const type = data.type || 'bar'
        
        // 服务端渲染为表格形式（静态展示）
        const rows = labels.map((label: string, i: number) => 
          `<tr><td class="border px-3 py-2">${label}</td><td class="border px-3 py-2 text-right">${values[i] ?? 0}</td></tr>`
        ).join('')
        
        return `<div class="my-4 overflow-hidden rounded-xl border bg-card">
  <div class="border-b bg-muted/30 px-4 py-2">
    <span class="text-sm font-medium">${title} (${type === 'line' ? '折线图' : '柱状图'})</span>
  </div>
  <div class="p-4">
    <table class="w-full text-sm">
      <thead><tr><th class="border px-3 py-2 text-left">项目</th><th class="border px-3 py-2 text-right">数值</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`
      } catch {
        return `<pre><code class="language-chart">${jsonContent}</code></pre>`
      }
    }
  )
}

/**
 * 预处理所有自定义代码块
 */
function preprocessCustomBlocks(markdown: string): string {
  let result = markdown
  result = preprocessImageBlock(result)
  result = preprocessWeatherBlock(result)
  result = preprocessChartBlock(result)
  return result
}

/**
 * 将 Markdown 转换为安全的 HTML (服务端)
 * 
 * 流程:
 * 1. 预处理: 转换自定义代码块 (```image, ```weather, ```chart)
 * 2. remark: Markdown -> HTML String (基础转换 + GFM 支持)
 * 3. rehype: 处理 HTML (如代码高亮)
 * 
 * 支持的语法:
 * - GFM (表格、删除线、任务列表、自动链接)
 * - 标准 Markdown 图片 ![alt](url)
 * - 自定义 ```image 代码块 (图片)
 * - 自定义 ```weather 代码块 (天气卡片)
 * - 自定义 ```chart 代码块 (图表，服务端渲染为表格)
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

