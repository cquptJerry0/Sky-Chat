/**
 * Landing Page Server Actions
 * 
 * 服务端操作 - 处理表单提交
 * 无需 JavaScript 也能工作
 * 
 * @module app/actions/landing
 */

'use server'

import { redirect } from 'next/navigation'
import { ConversationAPI } from '@/lib/services/conversation-api'

/**
 * 处理落地页消息提交
 * 
 * 
 * Server Action - 在服务端执行：
 * 1. 接收表单数据
 * 2. 验证用户登录状态
 * 3. 创建会话
 * 4. 重定向到会话页面
 * 
 * 特点：
 * - 无需 JavaScript
 * - 渐进增强（有 JS 时体验更好）
 * - 类型安全
 */
export async function submitLandingMessage(formData: FormData) {
  const message = formData.get('message') as string

  if (!message || !message.trim()) {
    // 返回错误（可以通过 useFormState 在客户端显示）
    return {
      success: false,
      error: '请输入消息',
    }
  }

  // 这里可以检查用户是否登录
  // const session = await getServerSession()
  // if (!session) {
  //   // 未登录 - 保存消息到 cookie 或 session
  //   // 然后重定向到登录页
  //   redirect('/auth/login?message=' + encodeURIComponent(message))
  // }

  try {
    // 已登录 - 创建会话
    // const { conversation } = await ConversationAPI.create()
    
    // 重定向到会话页面并携带消息
    // redirect(`/chat/${conversation.id}?message=${encodeURIComponent(message)}`)
    
    // 暂时重定向到聊天页（等用户登录后会处理）
    redirect('/chat?message=' + encodeURIComponent(message))
  } catch (error) {
    console.error('[Landing Action] Failed:', error)
    return {
      success: false,
      error: '创建会话失败，请重试',
    }
  }
}






