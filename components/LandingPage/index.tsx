/**
 * Landing Page Component - 落地页组件
 * 
 * 混合 SSR/CSR 架构：
 * - Server Component: 静态内容（Hero、特性介绍）
 * - Client Component: 交互部分（输入框、登录、教程）
 * 
 * 未登录用户的首页，精美简约设计
 * 
 * @module components/LandingPage
 */

import { LandingHero } from './LandingHero'
import { LandingInput } from './LandingInput'
import { LandingTutorial } from './LandingTutorial'

/**
 * 落地页主组件（Server Component）
 * 
 * 简约风格，细致设计，优化 SEO 和性能
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background pt-12">
      {/* 主内容区域 */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-6xl space-y-16">
          {/* Hero 区域（SSR） - 品牌和特性展示 */}
          <LandingHero />

          {/* 输入区域（CSR） - 交互入口 */}
          <div className="max-w-2xl mx-auto">
            <LandingInput />
          </div>
        </div>
      </div>

      {/* 新手教程（CSR） - 浮动按钮和弹窗 */}
      <LandingTutorial />
    </div>
  )
}

