/**
 * useClientValue - 客户端专用值 Hook
 * 
 * 解决 SSR/CSR Hydration Mismatch 问题
 */

import { useState, useEffect } from 'react'

/**
 * 在客户端 hydration 后计算值，避免 SSR/CSR 不一致
 */
export function useClientValue<T>(factory: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback)
  
  useEffect(() => {
    setValue(factory())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  return value
}

/**
 * 检测是否已完成客户端 hydration
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return mounted
}
