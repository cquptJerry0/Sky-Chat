/**
 * 性能指标 Tab
 */

'use client'

import { useDebugStore } from '../store'
import { getVitalColor, VITALS_THRESHOLDS } from '../types'

// ShadcnUI 组件
import { Card, CardContent } from '@/components/ui/card'

export function PerformanceTab() {
  const { vitals } = useDebugStore()

  const vitalsList = [
    { name: 'FCP', label: 'First Contentful Paint', unit: 'ms' },
    { name: 'LCP', label: 'Largest Contentful Paint', unit: 'ms' },
    { name: 'CLS', label: 'Cumulative Layout Shift', unit: '' },
    { name: 'INP', label: 'Interaction to Next Paint', unit: 'ms' },
  ] as const

  return (
    <div className="p-3 space-y-4">
      <div className="text-xs text-muted-foreground">Web Vitals</div>

      <div className="grid grid-cols-2 gap-3">
        {vitalsList.map(({ name, label, unit }) => {
          const value = vitals[name]
          const hasValue = value !== undefined

          return (
            <Card key={name} className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{name}</span>
                  {hasValue && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getVitalColor(name, value) }}
                    />
                  )}
                </div>
                <div className="text-lg font-bold" style={{
                  color: hasValue ? getVitalColor(name, value) : 'hsl(var(--muted-foreground))'
                }}>
                  {hasValue ? formatValue(value, unit) : '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 阈值说明 */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground mb-2">阈值参考</div>
          <div className="space-y-1 text-xs">
            {vitalsList.map(({ name, unit }) => {
              const threshold = VITALS_THRESHOLDS[name]
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-8 text-muted-foreground">{name}</span>
                  <span className="text-green-500">
                    {'<'} {threshold.good}{unit}
                  </span>
                  <span className="text-yellow-500">
                    {'<'} {threshold.poor}{unit}
                  </span>
                  <span className="text-red-500">
                    {'>='} {threshold.poor}{unit}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** 格式化数值 */
function formatValue(value: number, unit: string): string {
  if (unit === '') {
    return value.toFixed(3)
  }
  return `${Math.round(value)}${unit}`
}
