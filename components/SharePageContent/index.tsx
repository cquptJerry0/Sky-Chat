/**
 * 分享页面内容组件
 * 纯展示组件，支持服务端渲染
 */

import { MessageDisplay } from './MessageDisplay'
import { ShareHeader } from './ShareHeader'
import { ShareFooter } from './ShareFooter'

interface Message {
  id: string
  role: string
  content: string
  thinking?: string | null
  createdAt: string
}

interface SharedConversation {
  id: string
  title: string
  author: string
  createdAt: string
  sharedAt: string
  viewCount?: number
  messages: Message[]
}

interface SharePageContentProps {
  conversation: SharedConversation
}

export function SharePageContent({ conversation }: SharePageContentProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 页头 */}
      <ShareHeader conversation={conversation} />
      
      {/* 消息内容 */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {conversation.messages.length === 0 ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-muted-foreground">此会话暂无消息</p>
            </div>
          ) : (
            <div className="space-y-6">
              {conversation.messages.map((message) => (
                <MessageDisplay key={message.id} message={message} />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* 页脚 */}
      <ShareFooter />
    </div>
  )
}
