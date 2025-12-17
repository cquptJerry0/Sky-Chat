/**
 * SSE 工具函数
 * 
 * 前后端通用的 SSE 解析工具
 * 
 * @module lib/utils/sse
 */

/**
 * 解析 SSE 行数据
 * 
 * @param line - SSE 行字符串
 * @returns 解析后的数据字符串，如果是 [DONE] 或无效行则返回 null
 */
export function parseSSELine(line: string): string | null {
  if (!line.startsWith('data: ')) return null
  const data = line.slice(6).trim()
  if (data === '[DONE]') return null
  return data
}

/**
 * 分割 SSE buffer
 * 
 * 按换行符分割，保留最后一行（可能不完整）
 * 
 * @param buffer - 累积的 buffer 字符串
 * @returns lines: 完整的行数组, remaining: 剩余的不完整行
 */
export function splitSSEBuffer(buffer: string): { lines: string[]; remaining: string } {
  const lines = buffer.split('\n')
  const remaining = lines.pop() || ''
  return { lines, remaining }
}

/**
 * 解析 SSE 行并转为 JSON
 * 
 * @param line - SSE 行字符串
 * @returns 解析后的 JSON 对象，解析失败返回 null
 */
export function parseSSELineAsJSON<T = unknown>(line: string): T | null {
  const data = parseSSELine(line)
  if (!data) return null
  
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}
