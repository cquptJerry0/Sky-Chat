import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from '@/components/ui/toaster'
import { AccountLinkNotification } from '@/components/AccountLinkNotification'

export const metadata: Metadata = {
  title: 'Sky Chat',
  description: 'A ChatGPT-style SSE chat application with RxJS',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
          <AccountLinkNotification />
        </Providers>
      </body>
    </html>
  )
}
