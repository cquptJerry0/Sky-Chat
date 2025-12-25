/**
 * TTS 文本过滤工具
 *
 * 过滤掉不适合朗读的内容：
 * - 图片代码块 (```image)
 * - Markdown 表格
 * - 代码块
 * - 图片语法 ![alt](url)
 * - 纯 URL 链接
 */

/**
 * 过滤文本内容，移除不适合 TTS 朗读的部分
 *
 * @param content - 原始 Markdown 内容
 * @returns 过滤后的纯文本
 */
export function filterTextForTTS(content: string): string {
  let text = content

  // 1. 移除代码块（包括 ```image、```json 等）
  text = text.replace(/```[\s\S]*?```/g, '')

  // 2. 移除行内代码
  text = text.replace(/`[^`]+`/g, '')

  // 3. 移除 Markdown 表格
  // 匹配表头、分隔行、数据行
  text = text.replace(/\|[^\n]+\|(\n\|[-:\s|]+\|)?(\n\|[^\n]+\|)*/g, '')

  // 4. 移除图片语法 ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '')

  // 5. 保留链接文字，移除 URL：[text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // 6. 移除纯 URL（http/https 开头）
  text = text.replace(/https?:\/\/[^\s)]+/g, '')

  // 7. 移除 HTML 标签
  text = text.replace(/<[^>]+>/g, '')

  // 8. 移除 Markdown 标题符号 # ## ###
  text = text.replace(/^#{1,6}\s+/gm, '')

  // 9. 移除加粗/斜体符号但保留文字
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')

  // 10. 清理多余空白
  text = text
    .replace(/\n{3,}/g, '\n\n') // 多个换行合并
    .replace(/[ \t]+/g, ' ') // 多个空格合并
    .trim()

  return text
}
