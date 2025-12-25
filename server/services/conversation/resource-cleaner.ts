/**
 * 资源清理服务
 * 
 * 负责级联删除会话相关资源（消息、本地图片）
 */

import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { MessageRepository } from '@/server/repositories/message.repository'
import { ConversationRepository } from '@/server/repositories/conversation.repository'

/** 
 * 图片存储目录
 * 开发环境: public/generated
 * 生产环境: 通过 IMAGE_STORAGE_DIR 环境变量配置
 */
const IMAGE_STORAGE_DIR = process.env.IMAGE_STORAGE_DIR || 'public/generated'

/** 
 * 图片 URL 前缀
 * 开发环境: /generated
 * 生产环境: 通过 IMAGE_URL_PREFIX 环境变量配置
 */
const IMAGE_URL_PREFIX = process.env.IMAGE_URL_PREFIX || '/generated'

/** 删除结果 */
export interface DeleteResult {
  conversationId: string
  messagesDeleted: number
  imagesDeleted: number
  errors: string[]
}

/**
 * 从消息内容中提取本地图片 URL
 */
function extractImageUrls(content: string): string[] {
  const urls: string[] = []
  // 匹配 ```image\n{...}\n``` 格式
  const imageBlockRegex = /```image\n(\{[^}]+\})\n```/g
  let match
  while ((match = imageBlockRegex.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1])
      if (data.url && data.url.startsWith(IMAGE_URL_PREFIX)) {
        urls.push(data.url)
      }
    } catch {
      // 忽略解析错误
    }
  }
  return urls
}

/**
 * 删除本地图片文件
 */
async function deleteLocalImage(url: string): Promise<boolean> {
  // url 格式: {IMAGE_URL_PREFIX}/xxx.png
  const filename = url.replace(`${IMAGE_URL_PREFIX}/`, '')
  const filepath = path.join(process.cwd(), IMAGE_STORAGE_DIR, filename)
  
  if (!existsSync(filepath)) {
    return false
  }
  
  try {
    await unlink(filepath)
    return true
  } catch {
    return false
  }
}

/**
 * 级联删除会话及其所有资源
 */
export async function deleteConversationWithResources(
  conversationId: string,
  userId: string
): Promise<DeleteResult> {
  const result: DeleteResult = {
    conversationId,
    messagesDeleted: 0,
    imagesDeleted: 0,
    errors: [],
  }

  try {
    // 1. 获取会话的所有消息
    const messages = await MessageRepository.findByConversationId(conversationId)
    
    // 2. 收集所有图片 URL
    const imageUrls: string[] = []
    for (const msg of messages) {
      if (msg.content) {
        imageUrls.push(...extractImageUrls(msg.content))
      }
    }
    
    // 3. 删除本地图片
    for (const url of imageUrls) {
      try {
        const deleted = await deleteLocalImage(url)
        if (deleted) result.imagesDeleted++
      } catch {
        result.errors.push(`Failed to delete image: ${url}`)
      }
    }
    
    // 4. 删除数据库消息（通过 Prisma cascade 或手动）
    const deleteResult = await MessageRepository.deleteByConversationId(conversationId)
    result.messagesDeleted = deleteResult.count
    
    // 5. 删除会话记录
    await ConversationRepository.delete(conversationId, userId)
    
  } catch (e) {
    result.errors.push(`Cascade delete failed: ${(e as Error).message}`)
  }
  
  return result
}
