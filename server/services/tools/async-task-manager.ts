/**
 * 异步任务管理器
 * 
 * 管理长时间运行的工具任务（如图片生成）
 * 支持进度上报、取消操作
 */

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/** 任务状态数据 */
export interface TaskState {
  taskId: string
  toolCallId: string
  name: string
  status: TaskStatus
  progress: number  // 0-100
  result?: unknown
  error?: string
  abortController: AbortController
  createdAt: number
}

/** 任务结果 */
export interface TaskResult {
  success: boolean
  data?: unknown
  cancelled?: boolean
  error?: string
}

/** 进度回调 */
export type ProgressCallback = (taskId: string, progress: number) => void

/** 任务完成回调 */
export type CompleteCallback = (taskId: string, result: TaskResult) => void

/**
 * 异步任务管理器
 * 单例模式，内存存储
 */
class AsyncTaskManager {
  private tasks = new Map<string, TaskState>()
  private progressCallbacks = new Map<string, ProgressCallback>()
  private completeCallbacks = new Map<string, CompleteCallback>()

  /**
   * 创建新任务
   */
  createTask(toolCallId: string, name: string): TaskState {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const task: TaskState = {
      taskId,
      toolCallId,
      name,
      status: 'pending',
      progress: 0,
      abortController: new AbortController(),
      createdAt: Date.now(),
    }
    this.tasks.set(taskId, task)
    return task
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 通过 toolCallId 获取任务
   */
  getTaskByToolCallId(toolCallId: string): TaskState | undefined {
    for (const task of this.tasks.values()) {
      if (task.toolCallId === toolCallId) return task
    }
    return undefined
  }

  /**
   * 更新任务状态为运行中
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'pending') {
      task.status = 'running'
    }
  }

  /**
   * 更新任务进度
   */
  updateProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'running') {
      task.progress = Math.min(100, Math.max(0, progress))
      const callback = this.progressCallbacks.get(taskId)
      if (callback) callback(taskId, task.progress)
    }
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string, result: TaskResult): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = result.success ? 'completed' : 'failed'
    task.progress = 100
    task.result = result.data
    task.error = result.error

    const callback = this.completeCallbacks.get(taskId)
    if (callback) callback(taskId, result)

    // 清理回调
    this.progressCallbacks.delete(taskId)
    this.completeCallbacks.delete(taskId)
  }

  /**
   * 取消任务
   */
  cancelTask(toolCallId: string): boolean {
    const task = this.getTaskByToolCallId(toolCallId)
    if (!task) return false
    if (task.status !== 'pending' && task.status !== 'running') return false

    task.abortController.abort()
    task.status = 'cancelled'

    const callback = this.completeCallbacks.get(task.taskId)
    if (callback) callback(task.taskId, { success: false, cancelled: true })

    this.progressCallbacks.delete(task.taskId)
    this.completeCallbacks.delete(task.taskId)
    return true
  }

  /**
   * 注册进度回调
   */
  onProgress(taskId: string, callback: ProgressCallback): void {
    this.progressCallbacks.set(taskId, callback)
  }

  /**
   * 注册完成回调
   */
  onComplete(taskId: string, callback: CompleteCallback): void {
    this.completeCallbacks.set(taskId, callback)
  }

  /**
   * 清理过期任务（超过 5 分钟）
   */
  cleanup(): void {
    const now = Date.now()
    const expireTime = 5 * 60 * 1000
    for (const [taskId, task] of this.tasks) {
      if (now - task.createdAt > expireTime) {
        this.tasks.delete(taskId)
        this.progressCallbacks.delete(taskId)
        this.completeCallbacks.delete(taskId)
      }
    }
  }
}

/** 单例实例 */
export const asyncTaskManager = new AsyncTaskManager()
