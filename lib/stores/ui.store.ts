/**
 * UI Store - UI状态管理
 * 
 * 管理全局UI状态：
 * - Sidebar折叠状态
 * - 主题色配置
 * - 默认模型配置
 * - 其他用户偏好设置
 * 
 * 状态持久化到localStorage
 * 
 * @module stores/ui
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // ============ Sidebar状态 ============
  /** Sidebar是否折叠 */
  sidebarCollapsed: boolean
  
  /** 切换Sidebar折叠状态 */
  toggleSidebar: () => void
  
  /** 设置Sidebar折叠状态 */
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // ============ 用户配置 ============
  /** 默认模型ID */
  defaultModel: string
  
  /** 设置默认模型 */
  setDefaultModel: (modelId: string) => void
  
  /** 主题色（由next-themes管理，这里只记录用户偏好） */
  themePreference: 'light' | 'dark' | 'system'
  
  /** 设置主题偏好 */
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void
}

/**
 * UI Store Hook
 * 
 * 使用localStorage持久化
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // ============ 初始状态 ============
      sidebarCollapsed: false,
      defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
      themePreference: 'system',
      
      // ============ Actions ============
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      
      setDefaultModel: (modelId) =>
        set({ defaultModel: modelId }),
      
      setThemePreference: (theme) =>
        set({ themePreference: theme }),
    }),
    {
      name: 'sky-chat-ui',
      version: 1,
    }
  )
)
