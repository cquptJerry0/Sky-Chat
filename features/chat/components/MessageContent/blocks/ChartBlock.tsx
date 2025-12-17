'use client'

/**
 * 图表组件
 * 
 * 使用 recharts 渲染图表，支持的数据格式：
 * ```chart
 * {"type": "bar", "title": "销售数据", "labels": ["Q1", "Q2", "Q3", "Q4"], "values": [65, 59, 80, 81]}
 * ```
 * 
 * 支持的图表类型：bar（柱状图）、line（折线图）
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MediaBlockProps } from './registry'

interface ChartData {
  type: 'bar' | 'line'
  title?: string
  labels: string[]
  values: number[]
}

export function ChartBlock({ data, isStreaming }: MediaBlockProps) {
  const chartData = useMemo(() => {
    try {
      return JSON.parse(data) as ChartData
    } catch {
      return null
    }
  }, [data])

  // 转换为 recharts 格式
  const formattedData = useMemo(() => {
    if (!chartData) return []
    // 防御性检查：确保 labels 和 values 存在且是数组
    if (!Array.isArray(chartData.labels) || !Array.isArray(chartData.values)) {
      return []
    }
    return chartData.labels.map((label, index) => ({
      name: label,
      value: chartData.values[index] ?? 0,
    }))
  }, [chartData])

  // 检查数据是否有效（JSON 解析成功且有必要字段）
  const isValidData = chartData && Array.isArray(chartData.labels) && Array.isArray(chartData.values)

  // 流式传输中且数据无效时显示加载状态
  if (!isValidData) {
    if (isStreaming) {
      return (
        <div className="my-4 overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-muted/30 px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">图表</span>
          </div>
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        </div>
      )
    }
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <span className="text-sm text-destructive">无法解析图表数据</span>
      </div>
    )
  }

  const chartType = chartData.type || 'bar'
  const supportedTypes = ['bar', 'line']

  // 不支持的图表类型，显示友好提示
  if (!supportedTypes.includes(chartType)) {
    return (
      <div className="my-4 overflow-hidden rounded-xl border bg-amber-50 dark:bg-amber-950/30">
        <div className="border-b border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30 px-4 py-2">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            暂不支持的图表类型
          </span>
        </div>
        <div className="p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            暂不支持 <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">{chartType}</code> 类型图表
          </p>
          <p className="text-sm text-amber-500 dark:text-amber-500 mt-1">
            目前仅支持柱状图（bar）和折线图（line）
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border bg-card">
      {/* 标题 */}
      {chartData.title && (
        <div className="border-b bg-muted/30 px-4 py-2">
          <span className="text-sm font-medium">{chartData.title}</span>
        </div>
      )}

      {/* 图表区域 */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={250}>
          {chartType === 'line' ? (
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          ) : (
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
