'use client'

import { useEffect, useState } from 'react'

/** 地区检测结果 */
interface GeoCheckResult {
  allowed: boolean
  country: string
}

/** 是否已经检测过 */
let cachedResult: boolean | null = null

/**
 * 地区检测 Hook
 * 
 * 检测用户地区，如果不在中国大陆则显示遮罩
 */
export function useGeoCheck() {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(cachedResult)
  const [isLoading, setIsLoading] = useState(cachedResult === null)

  useEffect(() => {
    if (cachedResult !== null) return

    async function checkGeo() {
      try {
        const res = await fetch('/api/geo')
        const data: GeoCheckResult = await res.json()
        cachedResult = data.allowed
        setIsAllowed(data.allowed)
      } catch {
        cachedResult = true
        setIsAllowed(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkGeo()
  }, [])

  return { isAllowed, isLoading }
}
