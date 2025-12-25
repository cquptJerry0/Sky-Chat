'use server'

/**
 * 会话 Server Actions
 * 
 * 替代简单的 API 路由，直接在服务端执行
 */

import { getCurrentUserId } from '@/server/auth/utils'
import { ConversationRepository } from '@/server/repositories/conversation.repository'
import { deleteConversationWithResources } from '@/server/services/conversation/resource-cleaner'
import { audit } from '@/server/middleware/audit'
import { prisma } from '@/server/db/client'
import { randomBytes } from 'crypto'

/** 会话数据类型 */
export interface ConversationData {
  id: string
  title: string
  userId: string
  createdAt: string
  updatedAt: string
  isShared: boolean
  shareToken: string | null
  sharedAt: string | null
  isPinned: boolean
  pinnedAt: string | null
}

/** 操作结果 */
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 获取会话列表
 */
export async function getConversations(): Promise<ActionResult<ConversationData[]>> {
  try {
    const userId = await getCurrentUserId()
    const conversations = await ConversationRepository.findByUserId(userId)
    // 转换日期为字符串
    const data = conversations.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      sharedAt: c.sharedAt?.toISOString() || null,
      pinnedAt: c.pinnedAt?.toISOString() || null,
    }))
    return { success: true, data }
  } catch (error) {
    console.error('[Action] getConversations failed:', error)
    return { success: false, error: '获取会话列表失败' }
  }
}

/**
 * 创建新会话
 */
export async function createConversation(
  title?: string
): Promise<ActionResult<ConversationData>> {
  try {
    const userId = await getCurrentUserId()
    const conversation = await ConversationRepository.create(
      userId,
      title || '新对话'
    )

    await audit({
      userId,
      action: 'conversation.create',
      resourceId: conversation.id,
    })

    return {
      success: true,
      data: {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        sharedAt: conversation.sharedAt?.toISOString() || null,
        pinnedAt: conversation.pinnedAt?.toISOString() || null,
      },
    }
  } catch (error) {
    console.error('[Action] createConversation failed:', error)
    return { success: false, error: '创建会话失败' }
  }
}

/**
 * 删除会话（级联删除消息和图片）
 */
export async function deleteConversation(
  id: string
): Promise<ActionResult<{ messagesDeleted: number; imagesDeleted: number }>> {
  try {
    const userId = await getCurrentUserId()
    const result = await deleteConversationWithResources(id, userId)

    if (result.errors.length > 0 && result.messagesDeleted === 0) {
      return { success: false, error: '会话不存在' }
    }

    await audit({
      userId,
      action: 'conversation.delete',
      resourceId: id,
      metadata: {
        messagesDeleted: result.messagesDeleted,
        imagesDeleted: result.imagesDeleted,
      },
    })

    return {
      success: true,
      data: {
        messagesDeleted: result.messagesDeleted,
        imagesDeleted: result.imagesDeleted,
      },
    }
  } catch (error) {
    console.error('[Action] deleteConversation failed:', error)
    return { success: false, error: '删除会话失败' }
  }
}

/**
 * 更新会话标题
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<ActionResult> {
  try {
    if (!title.trim()) {
      return { success: false, error: '标题不能为空' }
    }

    const userId = await getCurrentUserId()
    const success = await ConversationRepository.updateTitle(id, userId, title)

    if (!success) {
      return { success: false, error: '会话不存在' }
    }

    await audit({
      userId,
      action: 'conversation.update',
      resourceId: id,
      metadata: { title },
    })

    return { success: true }
  } catch (error) {
    console.error('[Action] updateConversationTitle failed:', error)
    return { success: false, error: '更新标题失败' }
  }
}

/**
 * 切换会话置顶状态
 */
export async function toggleConversationPin(
  id: string,
  isPinned: boolean
): Promise<ActionResult<ConversationData>> {
  try {
    const userId = await getCurrentUserId()
    
    // 先验证会话属于当前用户
    const existing = await ConversationRepository.findById(id, userId)
    if (!existing) {
      return { success: false, error: '会话不存在' }
    }
    
    const conversation = await ConversationRepository.togglePin(id, isPinned)

    await audit({
      userId,
      action: 'conversation.update',
      resourceId: id,
      metadata: { isPinned },
    })

    return {
      success: true,
      data: {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        sharedAt: conversation.sharedAt?.toISOString() || null,
        pinnedAt: conversation.pinnedAt?.toISOString() || null,
      },
    }
  } catch (error) {
    console.error('[Action] toggleConversationPin failed:', error)
    return { success: false, error: '操作失败' }
  }
}


/** 分享结果 */
export interface ShareResult {
  shareToken: string
  shareUrl: string
  sharedAt: string
}

/**
 * 生成分享链接
 */
export async function shareConversation(
  id: string
): Promise<ActionResult<ShareResult>> {
  try {
    const userId = await getCurrentUserId()

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    })

    if (!conversation) {
      return { success: false, error: '会话不存在' }
    }

    let shareToken = conversation.shareToken
    if (!shareToken) {
      shareToken = randomBytes(16).toString('hex')
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        shareToken,
        isShared: true,
        sharedAt: new Date(),
      },
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareToken}`

    await audit({
      userId,
      action: 'conversation.share',
      resourceId: id,
    })

    return {
      success: true,
      data: {
        shareToken,
        shareUrl,
        sharedAt: updated.sharedAt?.toISOString() || new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('[Action] shareConversation failed:', error)
    return { success: false, error: '分享失败' }
  }
}

/**
 * 取消分享
 */
export async function unshareConversation(id: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    })

    if (!conversation) {
      return { success: false, error: '会话不存在' }
    }

    await prisma.conversation.update({
      where: { id },
      data: {
        isShared: false,
        sharedAt: null,
      },
    })

    await audit({
      userId,
      action: 'conversation.unshare',
      resourceId: id,
    })

    return { success: true }
  } catch (error) {
    console.error('[Action] unshareConversation failed:', error)
    return { success: false, error: '取消分享失败' }
  }
}
