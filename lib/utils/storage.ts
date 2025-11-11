/**
 * Storage Manager - 统一管理 localStorage
 * 
 * 提供类型安全的 localStorage 访问接口
 * 支持用户切换时清空数据
 * 
 * @module lib/utils/storage
 */

/** localStorage key 前缀，用于隔离应用数据 */
const STORAGE_PREFIX = 'sky-chat-'

/**
 * 存储键定义
 * 所有存储键都应该在这里定义，方便管理
 */
export const STORAGE_KEYS = {
  /** 用户选择的模型ID */
  SELECTED_MODEL: 'selected-model',
  /** 待发送的消息（未登录用户输入的消息） */
  PENDING_MESSAGE: 'pending-message',
} as const

/**
 * localStorage 管理器
 * 
 * 使用示例：
 * ```typescript
 * // 保存数据
 * StorageManager.set(STORAGE_KEYS.SELECTED_MODEL, 'qwen-max')
 * 
 * // 读取数据
 * const model = StorageManager.get(STORAGE_KEYS.SELECTED_MODEL)
 * 
 * // 删除数据
 * StorageManager.remove(STORAGE_KEYS.SELECTED_MODEL)
 * 
 * // 清空所有数据（用户登出时）
 * StorageManager.clearAll()
 * ```
 */
export const StorageManager = {
  /**
   * 保存数据到 localStorage
   * @param key - 存储键（不带前缀）
   * @param value - 要保存的值（会自动序列化）
   */
  set(key: string, value: unknown): void {
    if (typeof window === 'undefined') return

    try {
      const serializedValue = JSON.stringify(value)
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, serializedValue)
    } catch (error) {
      console.error(`[StorageManager] Failed to set ${key}:`, error)
    }
  },

  /**
   * 从 localStorage 读取数据
   * @param key - 存储键（不带前缀）
   * @returns 解析后的值，如果不存在或解析失败则返回 null
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
      if (item === null) return null
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`[StorageManager] Failed to get ${key}:`, error)
      return null
    }
  },

  /**
   * 删除指定的存储项
   * @param key - 存储键（不带前缀）
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    } catch (error) {
      console.error(`[StorageManager] Failed to remove ${key}:`, error)
    }
  },

  /**
   * 清空所有应用相关的存储数据
   * 只删除带有 STORAGE_PREFIX 前缀的项
   * 
   * 使用场景：
   * - 用户登出
   * - 用户切换账号
   */
  clearAll(): void {
    if (typeof window === 'undefined') return

    try {
      // 获取所有 localStorage 的键
      const keys = Object.keys(localStorage)

      // 只删除带有前缀的键
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })

      console.log('[StorageManager] Cleared all sky-chat data from localStorage')
    } catch (error) {
      console.error('[StorageManager] Failed to clear all:', error)
    }
  },

  /**
   * 检查是否存在指定的存储项
   * @param key - 存储键（不带前缀）
   * @returns 是否存在
   */
  has(key: string): boolean {
    if (typeof window === 'undefined') return false

    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${key}`) !== null
    } catch (error) {
      console.error(`[StorageManager] Failed to check ${key}:`, error)
      return false
    }
  },
}

