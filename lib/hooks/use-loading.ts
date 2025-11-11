/**
 * Loading Hook - 加载状态管理
 * 
 * 统一管理应用的加载状态，区分：
 * - 静默请求（silent）：不显示 loading，后台加载
 * - 显示请求（visible）：显示 loading 状态
 * 
 * @module lib/hooks/use-loading
 */

import { useState, useCallback } from 'react'

/**
 * 请求类型
 * - silent: 静默请求，不显示 loading
 * - visible: 显示 loading
 */
export type LoadingType = 'silent' | 'visible'

/**
 * 加载状态 Hook
 * 
 * 用于管理异步请求的加载状态
 * 
 * @example
 * ```tsx
 * const { isLoading, withLoading } = useLoading()
 * 
 * // 显示 loading 的请求
 * const handleSubmit = () => {
 *   withLoading(async () => {
 *     await api.submitForm(data)
 *   }, 'visible')
 * }
 * 
 * // 静默请求（后台加载）
 * const loadData = () => {
 *   withLoading(async () => {
 *     await api.fetchData()
 *   }, 'silent')
 * }
 * ```
 */
export function useLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<LoadingType>('visible')

  /**
   * 包装异步函数，自动管理 loading 状态
   * 
   * @param fn - 异步函数
   * @param type - 加载类型（默认 'visible'）
   * @returns Promise
   */
  const withLoading = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      type: LoadingType = 'visible'
    ): Promise<T> => {
      try {
        setLoadingType(type)
        setIsLoading(true)
        return await fn()
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * 手动设置 loading 状态
   * 
   * @param loading - 是否加载中
   * @param type - 加载类型
   */
  const setLoading = useCallback(
    (loading: boolean, type: LoadingType = 'visible') => {
      setLoadingType(type)
      setIsLoading(loading)
    },
    []
  )

  return {
    /** 是否正在加载 */
    isLoading,
    /** 加载类型 */
    loadingType,
    /** 是否显示 loading UI */
    shouldShowLoading: isLoading && loadingType === 'visible',
    /** 包装异步函数 */
    withLoading,
    /** 手动设置 loading 状态 */
    setLoading,
  }
}

/**
 * 全局 Loading Hook
 * 
 * 用于管理全局的加载状态（跨组件共享）
 * 可以用 Context 实现，这里提供基础版本
 */
export function useGlobalLoading() {
  // 这里可以用 Context 或状态管理库实现
  // 暂时返回 useLoading 的实例
  return useLoading()
}

