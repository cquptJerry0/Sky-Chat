/**
 * useClientValue - 客户端专用值 Hook
 * 
 * 解决 SSR/CSR Hydration Mismatch 问题：
 * - 时间戳、随机 ID 等非确定性内容在 SSR 和 CSR 阶段可能产生不同值
 * - 此 Hook 确保这类值仅在客户端 hydration 后才计算
 * 
 * @example
 * // 时间戳延迟渲染
 * const formattedTime = useClientValue(
 *   () => new Date().toLocaleString('zh-CN'),
 *   '加载中...'
 * )
 * 
 * @example
 * // 随机 ID 延迟生成
 * const sessionId = useClientValue(
 *   () => `session_${Math.random().toString(36).slice(2)}`,
 *   ''
 * )
 */

import { useState, useEffect } from 'react'

/**
 * 在客户端 hydration 后计算值，避免 SSR/CSR 不一致
 * 
 * @param factory - 值的工厂函数，仅在客户端执行
 * @param fallback - SSR 阶段的占位值
 * @returns 客户端计算的值或 SSR 占位值
 */
export function useClientValue<T>(factory: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback)
  
  useEffect(() => {
    // 客户端 hydration 后执行 factory
    setValue(factory())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  return value
}

/**
 * 检测是否已完成客户端 hydration
 * 
 * @example
 * const mounted = useIsMounted()
 * if (!mounted) return <Skeleton />
 * return <ClientOnlyContent />
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return mounted
}
