/**
 * 导出缓存服务 - IndexedDB 实现
 * 
 * 技术亮点：
 * - 使用 IndexedDB 存储大文件
 * - TTL 自动过期机制（5分钟）
 * - 支持缓存清理和管理
 */

interface CacheEntry {
  key: string
  data: Blob
  timestamp: number
  metadata: {
    conversationId: string
    format: string
    size: number
  }
}

class ExportCache {
  private dbName = 'sky-chat-export-cache'
  private storeName = 'exports'
  private version = 1
  private db: IDBDatabase | null = null
  private TTL = 5 * 60 * 1000 // 5分钟

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('conversationId', 'metadata.conversationId', { unique: false })
        }
      }
    })
  }

  /**
   * 生成缓存键
   */
  private generateKey(conversationId: string, format: string): string {
    return `${conversationId}_${format}`
  }

  /**
   * 获取缓存
   */
  async get(conversationId: string, format: string): Promise<Blob | null> {
    await this.init()
    
    const key = this.generateKey(conversationId, format)
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined
        
        if (!entry) {
          resolve(null)
          return
        }

        // 检查是否过期
        if (Date.now() - entry.timestamp > this.TTL) {
          this.delete(conversationId, format)
          resolve(null)
          return
        }

        resolve(entry.data)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 设置缓存
   */
  async set(
    conversationId: string,
    format: string,
    data: Blob
  ): Promise<void> {
    await this.init()

    const key = this.generateKey(conversationId, format)
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      metadata: {
        conversationId,
        format,
        size: data.size
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 删除缓存
   */
  async delete(conversationId: string, format: string): Promise<void> {
    await this.init()

    const key = this.generateKey(conversationId, format)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清理过期缓存
   */
  async cleanExpired(): Promise<number> {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('timestamp')
      const request = index.openCursor()
      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null
        
        if (cursor) {
          const entry = cursor.value as CacheEntry
          
          if (Date.now() - entry.timestamp > this.TTL) {
            cursor.delete()
            deletedCount++
          }
          
          cursor.continue()
        } else {
          resolve(deletedCount)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取缓存统计
   */
  async getStats(): Promise<{
    count: number
    totalSize: number
  }> {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[]
        const stats = {
          count: entries.length,
          totalSize: entries.reduce((sum, entry) => sum + entry.metadata.size, 0)
        }
        resolve(stats)
      }

      request.onerror = () => reject(request.error)
    })
  }
}

export const exportCache = new ExportCache()
