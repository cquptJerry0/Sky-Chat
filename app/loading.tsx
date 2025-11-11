/**
 * Global Loading Component - 全局加载组件
 * 
 * Next.js 会自动在页面级别显示此组件
 * 当路由切换或页面加载时显示
 * 
 * @module app/loading
 */

import { Loading } from '@/components/Loading'

/**
 * 全局加载状态组件
 * 
 * 复用 Loading 组件保持样式统一
 */
export default function GlobalLoading() {
  return <Loading />
}

