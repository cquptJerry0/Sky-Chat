'use client'

/**
 * 天气卡片组件
 * 
 * 渲染天气信息卡片，支持的数据格式：
 * ```weather
 * {"city": "北京", "temp": 25, "condition": "晴", "humidity": 45}
 * ```
 */

import { useMemo } from 'react'
import type { MediaBlockProps } from './registry'

interface WeatherData {
  city: string
  temp: number
  condition: string
  humidity?: number
  wind?: string
}

export function WeatherBlock({ data, isStreaming }: MediaBlockProps) {
  const weatherData = useMemo(() => {
    try {
      return JSON.parse(data) as WeatherData
    } catch {
      return null
    }
  }, [data])

  // 流式传输中且解析失败时显示加载状态
  if (!weatherData) {
    if (isStreaming) {
      return (
        <div className="my-4 overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="p-4 h-[140px] flex items-center justify-center">
            <span className="text-sm text-blue-600 dark:text-blue-400">加载中...</span>
          </div>
        </div>
      )
    }
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <span className="text-sm text-destructive">无法解析天气数据</span>
      </div>
    )
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <div className="p-4">
        {/* 城市名 */}
        <div className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400">
          {weatherData.city}
        </div>
        
        {/* 温度 */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-blue-900 dark:text-blue-100">
            {weatherData.temp}
          </span>
          <span className="text-xl text-blue-700 dark:text-blue-300">°C</span>
        </div>
        
        {/* 天气状况 */}
        <div className="mt-2 text-lg text-blue-800 dark:text-blue-200">
          {weatherData.condition}
        </div>
        
        {/* 额外信息 */}
        <div className="mt-3 flex gap-4 text-sm text-blue-600 dark:text-blue-400">
          {weatherData.humidity !== undefined && (
            <span>湿度 {weatherData.humidity}%</span>
          )}
          {weatherData.wind && (
            <span>{weatherData.wind}</span>
          )}
        </div>
      </div>
    </div>
  )
}
