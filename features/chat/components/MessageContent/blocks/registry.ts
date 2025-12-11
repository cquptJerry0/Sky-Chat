/**
 * 媒体组件注册表
 * 
 * 用于将 Markdown 代码块的语言标识映射到对应的 React 组件
 * 支持的语法：```weather / ```chart
 */

import { ComponentType } from 'react'
import { WeatherBlock } from './WeatherBlock.tsx'
import { ChartBlock } from './ChartBlock.tsx'

/**
 * 媒体块组件的 props 接口
 */
export interface MediaBlockProps {
  /** JSON 字符串格式的数据 */
  data: string
}

/**
 * 媒体组件注册表
 * key: 代码块语言标识
 * value: 对应的 React 组件
 */
export const mediaRegistry: Record<string, ComponentType<MediaBlockProps>> = {
  weather: WeatherBlock,
  chart: ChartBlock,
}

/**
 * 检查是否是媒体块
 * @param language 代码块的语言标识
 */
export function isMediaBlock(language: string): boolean {
  return language in mediaRegistry
}
