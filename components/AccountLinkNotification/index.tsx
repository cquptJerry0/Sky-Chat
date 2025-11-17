'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/lib/hooks/use-toast'
import { CheckCircle2 } from 'lucide-react'

export function AccountLinkNotification() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [hasShownNotification, setHasShownNotification] = React.useState(false)

  React.useEffect(() => {
    if (!session?.user || hasShownNotification) return

    const checkRecentLink = async () => {
      try {
        const res = await fetch('/api/auth/recent-link')
        if (!res.ok) return

        const data = await res.json()
        if (data.recentLink) {
          toast({
            title: '账号已关联',
            description: (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                <div className="space-y-1">
                  <p>
                    您的 {data.recentLink.provider === 'google' ? 'Google' : 'GitHub'} 账号已成功关联到 {session.user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    如果不是您本人操作，请立即修改密码
                  </p>
                </div>
              </div>
            ),
            duration: 8000,
          })
          setHasShownNotification(true)
        }
      } catch (error) {
        console.error('Failed to check recent link:', error)
      }
    }

    checkRecentLink()
  }, [session, hasShownNotification, toast])

  return null
}

