/**
 * 分享页面 SSR 版本
 * 服务端渲染，提升 SEO 和首屏加载性能
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { SharePageContent } from '@/components/SharePageContent'

/**
 * 生成页面元数据（SEO优化）
 */
export async function generateMetadata({
  params
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const conversation = await getSharedConversation(token)
  
  if (!conversation) {
    return {
      title: '分享不存在 - Sky Chat',
      description: '该分享链接已失效或不存在'
    }
  }
  
  const description = `查看 ${conversation.user?.username || '用户'} 分享的对话：${conversation.title}`
  const title = `${conversation.title} - Sky Chat 分享`
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: conversation.sharedAt?.toISOString(),
      authors: [conversation.user?.username || '匿名用户'],
      siteName: 'Sky Chat',
      locale: 'zh_CN'
    },
    twitter: {
      card: 'summary',
      title,
      description,
      creator: conversation.user?.username || undefined
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true
      }
    }
  }
}

/**
 * 分享页面组件（服务端渲染）
 */
export default async function SharePageSSR({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const conversation = await getSharedConversation(token)
  
  // 如果会话不存在，显示404页面
  if (!conversation) {
    notFound()
  }
  
  // 记录访问（异步，不阻塞渲染）- 暂时注释，等数据库迁移后启用
  // recordView(conversation.id).catch(console.error)
  
  // 格式化数据
  const formattedConversation = {
    id: conversation.id,
    title: conversation.title,
    author: conversation.user?.username || '匿名用户',
    createdAt: conversation.createdAt.toISOString(),
    sharedAt: conversation.sharedAt?.toISOString() || conversation.createdAt.toISOString(),
    // viewCount: conversation.viewCount || 0, // 等数据库迁移后启用
    messages: conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      thinking: msg.thinking,
      createdAt: msg.createdAt.toISOString()
    }))
  }
  
  return <SharePageContent conversation={formattedConversation} />
}

/**
 * 获取分享的会话数据
 */
async function getSharedConversation(token: string) {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        shareToken: token,
        isShared: true
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            thinking: true,
            createdAt: true
          }
        },
        user: {
          select: {
            username: true,
            image: true
          }
        }
      }
    })
    
    return conversation
  } catch (error) {
    console.error('Failed to fetch shared conversation:', error)
    return null
  }
}

/**
 * 记录访问次数（异步）- 等数据库迁移后启用
 */
// async function recordView(conversationId: string) {
//   try {
//     await prisma.conversation.update({
//       where: { id: conversationId },
//       data: { 
//         viewCount: { increment: 1 },
//         lastViewedAt: new Date()
//       }
//     })
//   } catch (error) {
//     console.error('Failed to record view:', error)
//   }
// }

/**
 * 静态参数生成（可选，用于预渲染常访问的分享）
 */
export async function generateStaticParams() {
  // 获取最近7天内的分享
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  try {
    const shares = await prisma.conversation.findMany({
      where: {
        isShared: true,
        sharedAt: {
          gte: sevenDaysAgo
        }
        // viewCount: {
        //   gte: 10 // 访问量大于10的
        // }
      },
      select: {
        shareToken: true
      },
      // orderBy: {
      //   viewCount: 'desc'
      // },
      take: 20 // 预渲染前20个分享
    })
    
    return shares
      .filter(share => share.shareToken)
      .map(share => ({
        token: share.shareToken!
      }))
  } catch (error) {
    console.error('Failed to generate static params:', error)
    return []
  }
}
