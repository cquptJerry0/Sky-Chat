/**
 * Storage Manager - 统一管理 localStorage
 *
 * 提供类型安全的 localStorage 访问接口
 * 支持用户数据和 UI 偏好的分类存储
 *
 * @module lib/utils/storage
 */

const USER_DATA_PREFIX = 'sky-chat-user-'
const UI_PREF_PREFIX = 'sky-chat-ui-'

/**
 * 存储键定义
 * 分为用户数据和 UI 偏好两类
 */
export const STORAGE_KEYS = {
  // 用户数据（退出登录时清除）
  USER: {
    SELECTED_MODEL: 'user-selected-model',
    PENDING_MESSAGE: 'user-pending-message',
  },

  // UI 偏好（退出登录时保留）
  UI: {
    SIDEBAR_COLLAPSED: 'ui-sidebar-collapsed',
    THEME_PREFERENCE: 'ui-theme-preference',
  },
} as const

/**
 * localStorage 管理器
 *
 * 使用示例：
 * ```typescript
 * // 保存用户数据
 * StorageManager.set(STORAGE_KEYS.USER.SELECTED_MODEL, 'qwen-max')
 *
 * // 保存 UI 偏好
 * StorageManager.set(STORAGE_KEYS.UI.SIDEBAR_COLLAPSED, true)
 *
 * // 读取数据
 * const model = StorageManager.get(STORAGE_KEYS.USER.SELECTED_MODEL)
 *
 * // 清空用户数据（退出登录时）
 * StorageManager.clearUserData()
 *
 * // 清空所有数据（重置应用时）
 * StorageManager.clearAll()
 * ```
 */
export const StorageManager = {
  /**
   * 保存数据到 localStorage
   * @param key - 存储键（带前缀，如 'user-selected-model'）
   * @param value - 要保存的值（会自动序列化）
   */
  set(key: string, value: unknown): void {
    if (typeof window === 'undefined') return

    try {
      const serializedValue = JSON.stringify(value)
      const fullKey = this.getFullKey(key)
      localStorage.setItem(fullKey, serializedValue)
    } catch (error) {
      console.error(`[StorageManager] Failed to set ${key}:`, error)
    }
  },

  /**
   * 从 localStorage 读取数据
   * @param key - 存储键（带前缀）
   * @returns 解析后的值，如果不存在或解析失败则返回 null
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
      const fullKey = this.getFullKey(key)
      const item = localStorage.getItem(fullKey)
      if (item === null) return null
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`[StorageManager] Failed to get ${key}:`, error)
      return null
    }
  },

  /**
   * 删除指定的存储项
   * @param key - 存储键（带前缀）
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return

    try {
      const fullKey = this.getFullKey(key)
      localStorage.removeItem(fullKey)
    } catch (error) {
      console.error(`[StorageManager] Failed to remove ${key}:`, error)
    }
  },

  /**
   * 清空用户数据（退出登录时调用）
   * 只删除 USER_DATA_PREFIX 前缀的项
   */
  clearUserData(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      let count = 0

      keys.forEach((key) => {
        if (key.startsWith(USER_DATA_PREFIX)) {
          localStorage.removeItem(key)
          count++
        }
      })

      console.log(`[StorageManager] Cleared ${count} user data items from localStorage`)
    } catch (error) {
      console.error('[StorageManager] Failed to clear user data:', error)
    }
  },

  /**
   * 清空所有应用相关的存储数据
   * 删除所有 sky-chat- 前缀的项（包括用户数据和 UI 偏好）
   *
   * 使用场景：
   * - 重置应用
   * - 清除所有缓存
   */
  clearAll(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      let count = 0

      keys.forEach((key) => {
        if (key.startsWith(USER_DATA_PREFIX) || key.startsWith(UI_PREF_PREFIX)) {
          localStorage.removeItem(key)
          count++
        }
      })

      console.log(`[StorageManager] Cleared ${count} items from localStorage`)
    } catch (error) {
      console.error('[StorageManager] Failed to clear all:', error)
    }
  },

  /**
   * 检查是否存在指定的存储项
   * @param key - 存储键（带前缀）
   * @returns 是否存在
   */
  has(key: string): boolean {
    if (typeof window === 'undefined') return false

    try {
      const fullKey = this.getFullKey(key)
      return localStorage.getItem(fullKey) !== null
    } catch (error) {
      console.error(`[StorageManager] Failed to check ${key}:`, error)
      return false
    }
  },

  /**
   * 获取完整的存储键
   * @param key - 存储键（如 'user-selected-model' 或 'ui-sidebar-collapsed'）
   * @returns 完整的键（如 'sky-chat-user-selected-model'）
   */
  getFullKey(key: string): string {
    if (key.startsWith('user-')) {
      return `${USER_DATA_PREFIX}${key.replace('user-', '')}`
    } else if (key.startsWith('ui-')) {
      return `${UI_PREF_PREFIX}${key.replace('ui-', '')}`
    }
    return `sky-chat-${key}`
  },
}

