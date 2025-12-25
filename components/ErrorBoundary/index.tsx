'use client'

/**
 * Error Boundary Component - 错误边界组件
 * 
 * 捕获子组件树中的 JavaScript 错误，显示降级 UI
 * 防止整个应用崩溃
 * 
 * @module components/ErrorBoundary
 */

import React, { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界组件
 * 
 * 使用 Class Component 实现（React 要求）
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新 state 以显示降级 UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到控制台
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)

    // 调用自定义错误处理器
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认降级 UI
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="max-w-md space-y-6 p-8 text-center">
            {/* 错误图标 */}
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* 错误标题 */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">出错了</h1>
              <p className="text-muted-foreground">
                应用遇到了一个意外错误，请尝试刷新页面或返回首页
              </p>
            </div>

            {/* 错误详情（仅开发环境） */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="rounded-lg bg-muted p-4 text-left">
                <p className="mb-2 text-sm font-semibold">错误详情：</p>
                <pre className="overflow-auto text-xs text-muted-foreground">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重试
              </Button>
              <Button onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                返回首页
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 错误边界 Hook（用于函数组件）
 * 
 * 提供简单的错误处理能力
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}

