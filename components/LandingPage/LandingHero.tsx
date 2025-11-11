/**
 * Landing Hero Component - 落地页 Hero 区域（SSR）
 * 
 * Server Component - 静态渲染
 * 精美简约的品牌展示和功能介绍
 * 
 * @module components/LandingPage/LandingHero
 */

import * as React from 'react'

/**
 * Hero 区域组件（Server Component）
 * 
 * 简约风格，细致设计，SEO 友好
 */
export function LandingHero() {
  return (
    <div className="space-y-16">
      {/* 品牌标识区域 */}
      <div className="text-center space-y-6">
        {/* 主标题 */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
            Sky Chat
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            新一代 AI 对话助手，让智能对话变得简单而优雅
          </p>
        </div>

        {/* 副标题 */}
        <div className="pt-4">
          <p className="text-3xl font-light text-[hsl(var(--text-primary))]">
            我能帮你什么？
          </p>
        </div>
      </div>

      {/* 核心特性介绍 - 简约卡片风格 */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 特性 1 */}
          <div className="group p-6 rounded-lg border border-border bg-card hover:shadow-md transition-all duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-[hsl(var(--text-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[hsl(var(--text-primary))]">
                实时响应
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                毫秒级流式输出，体验丝滑的对话流程
              </p>
            </div>
          </div>

          {/* 特性 2 */}
          <div className="group p-6 rounded-lg border border-border bg-card hover:shadow-md transition-all duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-[hsl(var(--text-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[hsl(var(--text-primary))]">
                思考可见
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                完整展现 AI 推理过程，让答案更可信
              </p>
            </div>
          </div>

          {/* 特性 3 */}
          <div className="group p-6 rounded-lg border border-border bg-card hover:shadow-md transition-all duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-[hsl(var(--text-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <h3 className="font-semibold text-[hsl(var(--text-primary))]">
                历史保存
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                自动保存所有对话，随时查看历史记录
              </p>
            </div>
          </div>

          {/* 特性 4 */}
          <div className="group p-6 rounded-lg border border-border bg-card hover:shadow-md transition-all duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-[hsl(var(--text-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[hsl(var(--text-primary))]">
                一键分享
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                生成分享链接，让他人也能看到精彩对话
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 使用场景展示 */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-[hsl(var(--text-primary))] mb-3">
            适用场景
          </h2>
          <p className="text-muted-foreground">
            无论是工作学习还是日常咨询，Sky Chat 都能为你提供帮助
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 场景 1 */}
          <div className="p-5 rounded-lg bg-muted/30 border border-border">
            <div className="space-y-2">
              <h4 className="font-medium text-[hsl(var(--text-primary))]">
                编程开发
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                代码审查、Bug 修复、算法设计、架构咨询
              </p>
            </div>
          </div>

          {/* 场景 2 */}
          <div className="p-5 rounded-lg bg-muted/30 border border-border">
            <div className="space-y-2">
              <h4 className="font-medium text-[hsl(var(--text-primary))]">
                学习研究
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                知识问答、论文写作、概念解释、学习规划
              </p>
            </div>
          </div>

          {/* 场景 3 */}
          <div className="p-5 rounded-lg bg-muted/30 border border-border">
            <div className="space-y-2">
              <h4 className="font-medium text-[hsl(var(--text-primary))]">
                内容创作
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                文案撰写、创意策划、内容优化、翻译润色
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部信息栏 */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>服务在线</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>端到端加密</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>快速响应</span>
          </div>
        </div>
      </div>
    </div>
  )
}
