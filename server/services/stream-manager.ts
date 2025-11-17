/**
 * Stream Manager Service - 流式传输管理服务
 * 
 * 功能：
 * - 管理多用户并发请求
 * - 前端中断后继续收集硅基流动的内容
 * - 续传时从内存读取并模拟SSE流
 */

import { Observable, interval, Subscription } from 'rxjs'

/**
 * 生成任务状态
 */
export interface GenerationTask {
  id: string
  userId: string
  conversationId: string
  messageId: string
  status: 'running' | 'paused' | 'completed' | 'error'
  
  // 已发送给前端的内容
  sentContent: string
  sentThinking: string
  
  // 后端收集的全部内容（包括前端中断后继续收集的）
  fullContent: string
  fullThinking: string
  
  createdAt: Date
  updatedAt: Date
}

/**
 * 流式数据块
 */
export interface StreamChunk {
  type: 'thinking' | 'answer' | 'complete' | 'error'
  content?: string
  error?: string
}

/**
 * 流式传输管理器
 * 
 * 单例模式，管理所有用户的生成任务
 */
class StreamManager {
  private tasks: Map<string, GenerationTask> = new Map()
  
  /**
   * 创建生成任务
   */
  createTask(
    messageId: string,
    userId: string,
    conversationId: string
  ): GenerationTask {
    if (!messageId || !userId || !conversationId) {
      throw new Error('messageId, userId, and conversationId are required')
    }

    const task: GenerationTask = {
      id: messageId,
      userId,
      conversationId,
      messageId,
      status: 'running',
      sentContent: '',
      sentThinking: '',
      fullContent: '',
      fullThinking: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    this.tasks.set(messageId, task)

    return task
  }
  
  /**
   * 获取任务
   */
  getTask(messageId: string): GenerationTask | undefined {
    return this.tasks.get(messageId)
  }
  
  /**
   * 更新任务 - 后端收集到的内容（全量）
   */
  updateFullContent(
    messageId: string,
    thinking: string,
    content: string
  ): void {
    if (!messageId) {
      console.error('[StreamManager] updateFullContent: messageId is required')
      return
    }
    
    const task = this.tasks.get(messageId)
    if (!task) {
      return
    }

    task.fullThinking = thinking || ''
    task.fullContent = content || ''
    task.updatedAt = new Date()
  }

  /**
   * 更新任务 - 已发送给前端的内容
   */
  updateSentContent(
    messageId: string,
    thinking: string,
    content: string
  ): void {
    if (!messageId) {
      console.error('[StreamManager] updateSentContent: messageId is required')
      return
    }

    const task = this.tasks.get(messageId)
    if (!task) {
      return
    }

    task.sentThinking = thinking || ''
    task.sentContent = content || ''
    task.updatedAt = new Date()
  }

  /**
   * 暂停任务（前端中断，但后端继续收集）
   */
  pauseTask(messageId: string): void {
    if (!messageId) {
      console.error('[StreamManager] pauseTask: messageId is required')
      return
    }

    const task = this.tasks.get(messageId)
    if (!task) {
      return
    }

    if (task.status === 'running') {
      task.status = 'paused'
      task.updatedAt = new Date()
    }
  }

  /**
   * 恢复任务（续传）
   */
  resumeTask(messageId: string): void {
    if (!messageId) {
      console.error('[StreamManager] resumeTask: messageId is required')
      return
    }

    const task = this.tasks.get(messageId)
    if (!task) {
      return
    }

    if (task.status === 'paused') {
      task.status = 'running'
      task.updatedAt = new Date()
    }
  }
  
  /**
   * 完成任务
   */
  completeTask(messageId: string): void {
    if (!messageId) {
      console.error('[StreamManager] completeTask: messageId is required')
      return
    }
    
    const task = this.tasks.get(messageId)
    if (!task) {
      return
    }

    task.status = 'completed'
    task.updatedAt = new Date()
  }

  /**
   * 标记任务错误
   */
  errorTask(messageId: string): void {
    if (!messageId) {
      console.error('[StreamManager] errorTask: messageId is required')
      return
    }

    const task = this.tasks.get(messageId)
    if (!task) {
      return
    }

    task.status = 'error'
    task.updatedAt = new Date()
  }
  
  /**
   * 删除任务
   */
  deleteTask(messageId: string): void {
    if (!messageId) {
      console.error('[StreamManager] deleteTask: messageId is required')
      return
    }
    
    this.tasks.delete(messageId)
  }
  
  /**
   * 获取未发送的内容（用于续传）
   */
  getUnsentContent(messageId: string): { thinking: string; content: string } {
    const task = this.tasks.get(messageId)
    if (!task) {
      return { thinking: '', content: '' }
    }
    
    return {
      thinking: task.fullThinking.slice(task.sentThinking.length),
      content: task.fullContent.slice(task.sentContent.length)
    }
  }
  
  /**
   * 模拟SSE流式传输未发送的内容
   * 
   * 从内存中读取后端收集的内容，模拟成SSE流返回给前端
   * 
   * @param messageId 消息ID
   * @param abortSignal 可选的AbortSignal，用于外部中断流
   */
  streamUnsentContent(messageId: string, abortSignal?: AbortSignal): Observable<StreamChunk> {
    return new Observable<StreamChunk>((observer) => {
      if (!messageId) {
        observer.error(new Error('messageId is required'))
        return
      }
      
      const task = this.tasks.get(messageId)
      if (!task) {
        observer.error(new Error(`Task not found: ${messageId}`))
        return
      }
      
      const unsent = this.getUnsentContent(messageId)
      
      // 如果没有未发送的内容，直接完成
      if (!unsent.thinking && !unsent.content) {
        observer.next({ type: 'complete' })
        observer.complete()
        return
      }
      
      let currentThinkingIndex = 0
      let currentContentIndex = 0
      let thinkingIntervalSub: Subscription | null = null
      let contentIntervalSub: Subscription | null = null
      let isAborted = false
      
      // 监听abort信号
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          isAborted = true

          // 清理所有 interval
          if (thinkingIntervalSub) thinkingIntervalSub.unsubscribe()
          if (contentIntervalSub) contentIntervalSub.unsubscribe()

          // 正常完成，不报错
          observer.complete()
        })
      }
      
      // 发送content的函数
      const streamContent = () => {
        if (!unsent.content) {
          observer.next({ type: 'complete' })
          observer.complete()
          return
        }
        
        const contentChars = unsent.content.split('')
        contentIntervalSub = interval(20).subscribe(() => {
          if (isAborted || abortSignal?.aborted) {
            contentIntervalSub?.unsubscribe()
            observer.complete()
            return
          }
          
          if (currentContentIndex < contentChars.length) {
            const char = contentChars[currentContentIndex]
            task.sentContent += char
            
            observer.next({
              type: 'answer',
              content: char,
            })
            
            currentContentIndex++
          } else {
            if (contentIntervalSub) contentIntervalSub.unsubscribe()
            observer.next({ type: 'complete' })
            observer.complete()
          }
        })
      }
      
      // 先发送thinking（如果有）
      if (unsent.thinking) {
        const thinkingChars = unsent.thinking.split('')
        thinkingIntervalSub = interval(30).subscribe(() => {
          if (isAborted || abortSignal?.aborted) {
            thinkingIntervalSub?.unsubscribe()
            observer.complete()
            return
          }
          
          if (currentThinkingIndex < thinkingChars.length) {
            const char = thinkingChars[currentThinkingIndex]
            task.sentThinking += char
            
            observer.next({
              type: 'thinking',
              content: char,
            })
            
            currentThinkingIndex++
          } else {
            if (thinkingIntervalSub) thinkingIntervalSub.unsubscribe()
            // thinking完成，开始发送content
            streamContent()
          }
        })
      } else {
        // 没有thinking，直接发送content
        streamContent()
      }
    })
  }
  
  /**
   * 获取用户的所有任务
   */
  getUserTasks(userId: string): GenerationTask[] {
    if (!userId) {
      console.error('[StreamManager] getUserTasks: userId is required')
      return []
    }
    
    return Array.from(this.tasks.values()).filter((task) => task.userId === userId)
  }
  
  /**
   * 清理过期任务（超过30分钟的已完成任务，超过2小时的paused任务）
   */
  cleanupOldTasks(): void {
    const now = Date.now()
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000)
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
    
    let cleanedCount = 0
    
    for (const [messageId, task] of this.tasks.entries()) {
      // 清理30分钟前完成或错误的任务
      if (
        (task.status === 'completed' || task.status === 'error') &&
        task.updatedAt < thirtyMinutesAgo
      ) {
        this.deleteTask(messageId)
        cleanedCount++
      }
      // 清理2小时前暂停的任务（可能是前端永久断开）
      else if (task.status === 'paused' && task.updatedAt < twoHoursAgo) {
        this.deleteTask(messageId)
        cleanedCount++
      }
    }
    

  }
}

// 导出单例
export const streamManager = new StreamManager()

// 定期清理过期任务（每10分钟检查一次）
// 保存interval ID以便测试和进程退出时清理
export const cleanupInterval = setInterval(() => {
  streamManager.cleanupOldTasks()
}, 10 * 60 * 1000)

// 进程退出时清理资源
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval)
  streamManager.cleanupOldTasks()
})

process.on('SIGINT', () => {
  clearInterval(cleanupInterval)
  streamManager.cleanupOldTasks()
  process.exit(0)
})
