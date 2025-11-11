'use client'

/**
 * Share Page Overlay - 分享页蒙版组件
 * 
 * 显示一个蒙版和引导卡片，引导用户登录后开始对话
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Sparkles } from 'lucide-react'
import { LoginDialog } from '@/components/LoginDialog'

interface SharePageOverlayProps {
  conversationId: string
}

export function SharePageOverlay({ conversationId }: SharePageOverlayProps) {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  
  const handleClick = () => {
    // 显示登录对话框
    setShowLogin(true)
  }
  
  const handleLoginSuccess = () => {
    // 登录成功后，跳转到新会话并携带当前conversation作为引用
    router.push(`/chat?ref=${conversationId}`)
  }
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClick}
    >
      <Card 
        className="w-full max-w-md mx-4 shadow-2xl border-2 cursor-pointer hover:border-primary transition-all duration-300 hover:scale-105"
        onClick={handleClick}
      >
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            开始你的 AI 对话
          </CardTitle>
          <CardDescription className="text-base mt-2">
            登录后即可创建自己的对话，体验智能聊天
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button 
            size="lg" 
            className="w-full text-lg h-12"
            onClick={handleClick}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            立即开始对话
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            点击任意位置继续
          </div>
        </CardContent>
      </Card>
      
      {/* 登录对话框 */}
      <LoginDialog 
        open={showLogin}
        onOpenChange={setShowLogin}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
