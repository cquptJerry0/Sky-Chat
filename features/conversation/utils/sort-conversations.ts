import type { ConversationData } from '@/app/actions/conversation'

/**
 * 会话排序工具函数
 * 
 * 排序规则：
 * 1. 置顶会话在前
 * 2. 置顶会话按 pinnedAt 降序（最近置顶的在前）
 * 3. 非置顶会话按 updatedAt 降序（最近更新的在前）
 * 
 * @param conversations - 待排序的会话列表
 * @returns 排序后的会话列表（新数组）
 */
export function sortConversations(conversations: ConversationData[]): ConversationData[] {
  return [...conversations].sort((a, b) => {
    // 置顶的排在前面
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1

    // 都置顶或都不置顶，按时间排序
    if (a.isPinned && b.isPinned) {
      return new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime()
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

