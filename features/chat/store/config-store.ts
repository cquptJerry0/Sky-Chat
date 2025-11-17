/**
 * Config Store - 配置管理
 * 
 * 负责模型选择、思考模式等配置
 */

import { create } from 'zustand'
import { getDefaultModel, getModelById } from '@/features/chat/constants/models'
import { StorageManager, STORAGE_KEYS } from '@/lib/utils/storage'

interface ConfigState {
  // 模型配置
  selectedModel: string
  enableThinking: boolean
  
  // Actions
  setModel: (modelId: string) => void
  toggleThinking: (enabled: boolean) => void
  reset: () => void
}

function getInitialModel(): string {
  if (typeof window === 'undefined') return getDefaultModel().id

  const stored = StorageManager.get<string>(STORAGE_KEYS.USER.SELECTED_MODEL)
  if (stored) {
    const model = getModelById(stored)
    if (model) return stored
  }

  return getDefaultModel().id
}

const initialState = {
  selectedModel: getInitialModel(),
  enableThinking: false,
}

export const useConfigStore = create<ConfigState>((set) => ({
  ...initialState,

  setModel: (modelId) => {
    const model = getModelById(modelId)
    if (!model) {
      console.warn(`Model ${modelId} not found`)
      return
    }

    set({ selectedModel: modelId })
    StorageManager.set(STORAGE_KEYS.USER.SELECTED_MODEL, modelId)
  },

  toggleThinking: (enabled) => set({ enableThinking: enabled }),

  reset: () => set(initialState),
}))

