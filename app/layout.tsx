import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from '@/components/ui/toaster'
import { AccountLinkNotification } from '@/components/AccountLinkNotification'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Sky Chat',
  description: 'AI 智能对话助手 - 基于硅基流动的智能聊天应用',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster />
            <AccountLinkNotification />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
