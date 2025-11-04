export type SyncEventType =
  | 'MESSAGE_ADD'
  | 'MESSAGE_STREAM'
  | 'LOADING_STATE'

export interface MessageSyncPayload {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  hasError?: boolean
  sessionId?: string
  userMessage?: string
}

export interface StreamSyncPayload {
  messageId: string | number
  content: string
  sessionId?: string
}

export interface LoadingStateSyncPayload {
  isLoading: boolean
}

export type SyncPayload =
  | MessageSyncPayload
  | StreamSyncPayload
  | LoadingStateSyncPayload

export interface SyncMessage {
  type: SyncEventType
  payload: SyncPayload
  timestamp: number
  tabId: string
}

