'use client'

/**
 * 分享按钮组件
 * 用于生成和管理会话分享链接
 */

import { useState, useEffect } from 'react'
import { Share2, Link2, X, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'

interface ShareButtonProps {
  conversationId: string
  className?: string
}

export function ShareButton({ conversationId, className }: ShareButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  
  // 检查分享状态
  useEffect(() => {
    // TODO: 检查会话是否已分享
  }, [conversationId])
  
  const handleShare = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('分享失败')
      }
      
      const data = await response.json()
      setShareUrl(data.shareUrl)
      setIsShared(true)
      
      toast({
        title: '分享成功',
        description: '分享链接已生成'
      })
    } catch (error) {
      console.error('Share error:', error)
      toast({
        title: '分享失败',
        description: '无法生成分享链接',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleUnshare = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('取消分享失败')
      }
      
      setShareUrl('')
      setIsShared(false)
      
      toast({
        title: '已取消分享',
        description: '分享链接已失效'
      })
    } catch (error) {
      console.error('Unshare error:', error)
      toast({
        title: '操作失败',
        description: '无法取消分享',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      toast({
        title: '已复制',
        description: '分享链接已复制到剪贴板'
      })
      
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Copy error:', error)
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive'
      })
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Share2 className="h-4 w-4 mr-2" />
          分享
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享会话</DialogTitle>
          <DialogDescription>
            {isShared
              ? '任何拥有此链接的人都可以查看这个会话'
              : '生成一个公开链接，让其他人可以查看这个会话'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isShared && shareUrl && (
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={isCopied}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <span>
              {isShared
                ? '分享链接已激活'
                : '分享链接未激活'}
            </span>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          {isShared ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnshare}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                取消分享
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(shareUrl, '_blank')}
              >
                打开链接
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleShare}
                disabled={isLoading}
              >
                <Share2 className="h-4 w-4 mr-2" />
                生成分享链接
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
