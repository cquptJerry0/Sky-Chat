'use client'

import { useGeoCheck } from '@/lib/hooks/use-geo-check'

/**
 * 地区检测组件
 * 
 * 如果用户不在中国大陆，显示全屏遮罩
 */
export function GeoChecker() {
  const { isAllowed, isLoading } = useGeoCheck()

  // 加载中或允许访问，不显示遮罩
  if (isLoading || isAllowed) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md text-center px-6">
        <h1 className="text-2xl font-bold mb-4">服务不可用</h1>
        <p className="text-muted-foreground mb-2">
          抱歉，本服务仅在中国大陆地区可用。
        </p>
        <p className="text-muted-foreground text-sm">
          Sorry, this service is only available in mainland China.
        </p>
      </div>
    </div>
  )
}
