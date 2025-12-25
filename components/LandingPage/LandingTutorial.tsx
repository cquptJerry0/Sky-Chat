'use client'

/**
 * Landing Tutorial Component - 落地页新手教程（CSR）
 * 
 * Client Component - 交互式新手引导
 * 展示如何使用 Sky Chat 的基本步骤
 * 
 * @module components/LandingPage/LandingTutorial
 */

import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TutorialStep {
  title: string
  description: string
  illustration: string
}

const tutorialSteps: TutorialStep[] = [
  {
    title: '欢迎使用 Sky Chat',
    description: '一个简单、优雅、强大的 AI 对话助手。让我们用 30 秒了解如何使用它。',
    illustration: 'welcome',
  },
  {
    title: '输入你的问题',
    description: '在下方输入框中输入任何问题，可以是工作、学习、生活中的任何内容。',
    illustration: 'input',
  },
  {
    title: '实时查看 AI 思考',
    description: 'Sky Chat 会展示 AI 的推理过程，让你了解答案是如何产生的。',
    illustration: 'thinking',
  },
  {
    title: '获得精准回答',
    description: 'AI 会给出详细、准确的回答，支持代码高亮、数学公式等多种格式。',
    illustration: 'answer',
  },
  {
    title: '管理对话历史',
    description: '所有对话自动保存在左侧栏，随时查看、搜索、继续之前的对话。',
    illustration: 'history',
  },
  {
    title: '分享精彩对话',
    description: '点击分享按钮生成链接，让朋友也能看到你和 AI 的精彩对话。',
    illustration: 'share',
  },
]

/**
 * 新手教程组件
 * 
 * 提供步进式引导，帮助新用户快速上手
 */
export function LandingTutorial() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsOpen(false)
      setCurrentStep(0)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setIsOpen(false)
    setCurrentStep(0)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          新手教程
        </Button>
      </div>
    )
  }

  const step = tutorialSteps[currentStep]
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-lg shadow-2xl border border-border overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* 进度条 */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 内容区域 */}
        <div className="p-8 space-y-8">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* 插图区域 */}
          <div className="flex items-center justify-center h-48">
            <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg">
              <IllustrationPlaceholder type={step.illustration} />
            </div>
          </div>

          {/* 文字内容 */}
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-semibold text-[hsl(var(--text-primary))]">
              {step.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
              {step.description}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              跳过教程
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一步
              </Button>
              <Button onClick={handleNext}>
                {currentStep === tutorialSteps.length - 1 ? (
                  '开始使用'
                ) : (
                  <>
                    下一步
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 插图占位符组件
 * 使用简约的图标代替插图
 */
function IllustrationPlaceholder({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    welcome: (
      <svg className="w-24 h-24 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
    input: (
      <svg className="w-24 h-24 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    thinking: (
      <svg className="w-24 h-24 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    answer: (
      <svg className="w-24 h-24 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    history: (
      <svg className="w-24 h-24 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    share: (
      <svg className="w-24 h-24 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  }

  return icons[type] || icons.welcome
}

