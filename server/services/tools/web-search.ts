/**
 * 网页搜索工具
 * 
 * 使用 Tavily API 进行网页搜索
 */

import type { Tool } from './types'

const TAVILY_API_URL = 'https://api.tavily.com/search'
const SEARCH_TIMEOUT = 10000 // 10 秒超时

/**
 * Tavily 搜索结果
 */
interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
}

/**
 * Tavily API 响应
 */
interface TavilyResponse {
  answer?: string
  results: TavilySearchResult[]
}

/**
 * 调用 Tavily API 进行搜索
 */
async function searchTavily(query: string, apiKey: string): Promise<TavilyResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 格式化搜索结果为字符串
 */
export function formatSearchResults(response: TavilyResponse): string {
  const parts: string[] = []

  // 添加 AI 生成的答案摘要
  if (response.answer) {
    parts.push(`摘要: ${response.answer}`)
  }

  // 添加搜索结果
  if (response.results && response.results.length > 0) {
    parts.push('\n相关结果:')
    response.results.forEach((result, index) => {
      parts.push(`\n${index + 1}. ${result.title}`)
      parts.push(`   来源: ${result.url}`)
      parts.push(`   ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`)
    })
  }

  if (parts.length === 0) {
    return '未找到相关搜索结果'
  }

  return parts.join('\n')
}

/**
 * 创建网页搜索工具
 */
export function createWebSearchTool(apiKey: string): Tool {
  return {
    name: 'web_search',
    description: '搜索互联网获取最新信息。当用户询问实时信息、新闻、最新数据、当前事件时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
      },
      required: ['query'],
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string

      if (!query || typeof query !== 'string') {
        return '错误: 搜索查询不能为空'
      }

      try {
        console.log(`[WebSearch] Searching for: ${query}`)
        const response = await searchTavily(query, apiKey)
        const resultCount = response.results?.length || 0
        console.log(`[WebSearch] Found ${resultCount} results`)
        return formatSearchResults(response)
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error('[WebSearch] Search timeout')
            return '搜索超时，请稍后重试'
          }
          console.error('[WebSearch] Search error:', error.message)
          return `搜索失败: ${error.message}`
        }
        return '搜索失败: 未知错误'
      }
    },
  }
}
