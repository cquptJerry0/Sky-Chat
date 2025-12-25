/**
 * 消息状态机
 * 
 * 实现消息阶段的状态转换逻辑
 */

import type { MessagePhase, PhaseEvent } from '../types/message-state'

/** 有效的状态转换 */
export const VALID_TRANSITIONS: Record<MessagePhase, MessagePhase[]> = {
  idle: ['thinking', 'answering', 'error'],
  thinking: ['tool_calling', 'answering', 'error'],
  tool_calling: ['answering', 'tool_calling', 'error'],
  answering: ['idle', 'tool_calling', 'error'],
  error: ['idle'],
}

/**
 * 将事件映射到目标阶段
 */
export function eventToPhase(event: PhaseEvent): MessagePhase {
  switch (event.type) {
    case 'START_THINKING': return 'thinking'
    case 'START_TOOL_CALL': return 'tool_calling'
    case 'START_ANSWERING': return 'answering'
    case 'COMPLETE': return 'idle'
    case 'ERROR': return 'error'
    case 'TOOL_COMPLETE': return 'tool_calling'
    case 'TOOL_PROGRESS': return 'tool_calling'
    case 'TOOL_CANCEL': return 'tool_calling'
  }
}

/**
 * 计算下一个阶段
 */
export function getNextPhase(
  currentPhase: MessagePhase,
  event: PhaseEvent
): MessagePhase | null {
  if (event.type === 'TOOL_COMPLETE' || event.type === 'TOOL_PROGRESS' || event.type === 'TOOL_CANCEL') {
    return currentPhase
  }
  
  const targetPhase = eventToPhase(event)
  
  if (currentPhase === targetPhase) {
    return targetPhase
  }
  
  if (VALID_TRANSITIONS[currentPhase].includes(targetPhase)) {
    return targetPhase
  }
  
  console.warn('[StateMachine] Invalid transition:', currentPhase, '->', targetPhase)
  return null
}

/**
 * 创建初始消息运行时状态
 */
export function createInitialState() {
  return {
    phase: 'idle' as MessagePhase,
    activeTools: new Map(),
  }
}
