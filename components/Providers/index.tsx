'use client'

/**
 * Providers Component - 客户端Provider包装器
 * 
 * 集中管理所有需要客户端渲染的Provider：
 * - SessionProvider（NextAuth.js）
 * - ThemeProvider
 * - TooltipProvider
 */

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}

