/**
 * Home Page - 首页 (Server Component)
 * 
 * 架构优化：
 * - 鉴权上移至 Middleware (middleware.ts)
 * - 本页面变为纯 Server Component，实现 HTML 直出
 * - 仅展示 LandingPage，已登录用户的重定向由中间件处理
 * 
 * @module app/page
 */

import { LandingPage } from '@/components/LandingPage'

/**
 * 首页组件 (RSC)
 * 
 * 职责单一：只负责渲染 LandingPage。
 * 登录状态检查和重定向已移交至 middleware.ts 处理，
 * 从而实现首屏 HTML 直出，消除 JS 阻塞。
 */
export default function HomePage() {
    return <LandingPage />
}
