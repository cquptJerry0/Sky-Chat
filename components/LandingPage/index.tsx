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
    <div className="min-h-screen bg-background">
      {/* 主内容区域 */}
      <div className="flex flex-col items-center justify-center min-h-screen py-12 px-6">
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

      {/* 页脚信息 */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-muted-foreground">
            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--text-primary))] mb-3">
                关于 Sky Chat
              </h4>
              <p className="leading-relaxed">
                新一代 AI 对话助手，致力于提供简单、优雅、强大的智能对话体验。
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--text-primary))] mb-3">
                快速链接
              </h4>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="hover:text-[hsl(var(--text-primary))] transition-colors">
                    功能介绍
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[hsl(var(--text-primary))] transition-colors">
                    使用文档
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[hsl(var(--text-primary))] transition-colors">
                    常见问题
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--text-primary))] mb-3">
                联系我们
              </h4>
              <ul className="space-y-1">
                <li>邮箱：support@skychat.com</li>
                <li>反馈：feedback@skychat.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            <p>&copy; 2024 Sky Chat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

