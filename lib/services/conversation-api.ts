/**
 * Conversation API Service
 * 
 * 会话相关的API调用封装
 */

export interface Conversation {
  id: string
  title: string
  userId: string
  createdAt: string
  updatedAt: string
  isShared: boolean
  shareToken?: string
  sharedAt?: string
  _count?: {
    messages: number
  }
}

export interface Message {
  id: string
  conversationId: string
  role: string
  content: string
  thinking?: string
  toolCalls?: any
  createdAt: string
}

export const ConversationAPI = {
  /**
   * 获取会话列表
   */
  async list(): Promise<{ conversations: Conversation[] }> {
    const res = await fetch('/api/conversations', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch conversations')
    }
    
    return res.json()
  },
  
  /**
   * 创建新会话
   */
  async create(title?: string): Promise<{ conversation: Conversation }> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || '新对话' }),
    })
    
    if (!res.ok) {
      throw new Error('Failed to create conversation')
    }
    
    return res.json()
  },
  
  /**
   * 获取单个会话详情
   */
  async get(id: string): Promise<{ conversation: Conversation }> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch conversation')
    }
    
    return res.json()
  },
  
  /**
   * 更新会话标题
   */
  async updateTitle(id: string, title: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    
    if (!res.ok) {
      throw new Error('Failed to update conversation')
    }
    
    return res.json()
  },
  
  /**
   * 删除会话
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to delete conversation')
    }
    
    return res.json()
  },
  
  /**
   * 获取会话的所有消息
   */
  async getMessages(id: string): Promise<{ messages: Message[] }> {
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch messages')
    }
    
    return res.json()
  },
  
  /**
   * 生成分享链接
   */
  async share(id: string): Promise<{ shareUrl: string; shareToken: string; sharedAt: string }> {
    const res = await fetch(`/api/conversations/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to share conversation')
    }
    
    return res.json()
  },
  
  /**
   * 取消分享
   */
  async unshare(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/conversations/${id}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      throw new Error('Failed to unshare conversation')
    }
    
    return res.json()
  },
}

