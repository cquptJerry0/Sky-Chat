/**
 * 工具编排器
 * 
 * 负责工具的分类执行：快速工具同步、慢速工具异步
 */

import { toolRegistry, type ToolCall } from '@/server/services/tools'
import {
  executeToolCalls,
  isSlowTool,
  executeToolAsync,
} from '@/server/services/tools/handler'
import { SSEWriter, type ToolResultData } from './sse-writer'

/** 待处理的慢速任务 */
export interface PendingSlowTask {
  toolCallId: string
  name: string
  taskId: string
}

/** 工具执行结果 */
export interface ToolExecutionResult {
  fastResults: ToolResultData[]
  pendingSlowTasks: PendingSlowTask[]
}

/**
 * 执行工具调用
 * 
 * @param toolCalls - 工具调用列表
 * @param writer - SSE 写入器
 * @returns 执行结果
 */
export async function executeTools(
  toolCalls: ToolCall[],
  writer: SSEWriter
): Promise<ToolExecutionResult> {
  // 分离快速工具和慢速工具
  const fastTools = toolCalls.filter((tc) => !isSlowTool(tc.function.name))
  const slowTools = toolCalls.filter((tc) => isSlowTool(tc.function.name))

  // 慢速工具异步执行（不阻塞）
  const pendingSlowTasks: PendingSlowTask[] = []
  for (const tc of slowTools) {
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(tc.function.arguments)
    } catch {
      /* ignore */
    }

    const taskId = executeToolAsync(
      tc.id,
      tc.function.name,
      args,
      // 进度回调
      (_taskId, progress) => {
        writer.sendToolProgress(tc.id, progress)
      },
      // 完成回调（稍后处理）
      () => {}
    )
    pendingSlowTasks.push({ toolCallId: tc.id, name: tc.function.name, taskId })
  }

  // 快速工具同步执行
  const rawResults = await executeToolCalls(fastTools, toolRegistry)
  const fastResults: ToolResultData[] = []
  for (const result of rawResults) {
    const resultData = writer.sendToolResult(result)
    fastResults.push(resultData)
  }

  return { fastResults, pendingSlowTasks }
}

/**
 * 等待慢速任务完成
 * 
 * @param pending - 待处理任务
 * @param writer - SSE 写入器
 * @returns 任务结果
 */
export async function waitForSlowTask(
  pending: PendingSlowTask,
  writer: SSEWriter
): Promise<ToolResultData> {
  const { asyncTaskManager } = await import(
    '@/server/services/tools/async-task-manager'
  )

  return new Promise((resolve) => {
    const checkTask = () => {
      const task = asyncTaskManager.getTask(pending.taskId)
      if (!task) {
        resolve({
          toolCallId: pending.toolCallId,
          name: pending.name,
          result: { success: false },
        })
        return
      }

      if (
        task.status === 'completed' ||
        task.status === 'failed' ||
        task.status === 'cancelled'
      ) {
        const data = task.result as
          | { url?: string; width?: number; height?: number; error?: string }
          | undefined
        const result = {
          success: task.status === 'completed',
          imageUrl: data?.url,
          width: data?.width,
          height: data?.height,
          cancelled: task.status === 'cancelled',
          error: task.status === 'failed' ? (data?.error || '图片生成失败') : undefined,
        }

        writer.sendSlowTaskResult(pending.toolCallId, pending.name, result)

        resolve({
          toolCallId: pending.toolCallId,
          name: pending.name,
          result,
        })
        return
      }

      // 继续等待
      setTimeout(checkTask, 500)
    }

    checkTask()
  })
}

/**
 * 等待所有慢速任务完成
 */
export async function waitForAllSlowTasks(
  pendingTasks: PendingSlowTask[],
  writer: SSEWriter
): Promise<ToolResultData[]> {
  const results: ToolResultData[] = []
  for (const pending of pendingTasks) {
    const result = await waitForSlowTask(pending, writer)
    results.push(result)
  }
  return results
}
