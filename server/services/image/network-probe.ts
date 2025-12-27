/**
 * 网络探测模块
 * 
 * 检测 SiliconFlow S3 是否可达
 */

const S3_HOST = 's3.siliconflow.cn'
const PROBE_TIMEOUT = 5000 // 5秒超时

/** 探测结果缓存 */
let probeResult: boolean | null = null
let probePromise: Promise<boolean> | null = null

/**
 * 探测 SiliconFlow S3 是否可达
 */
async function probe(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT)
    
    // 用 HEAD 请求探测，比 ping 更可靠
    await fetch(`https://${S3_HOST}`, {
      method: 'HEAD',
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    // 即使返回 403/404 也说明网络通
    return true
  } catch (error) {
    console.warn(`[NetworkProbe] ${S3_HOST} 不可达:`, error instanceof Error ? error.message : error)
    return false
  }
}

/**
 * 检测 SiliconFlow S3 是否可用
 * 
 * 首次调用会执行探测，后续返回缓存结果
 */
export async function isSiliconFlowS3Available(): Promise<boolean> {
  // 已有结果，直接返回
  if (probeResult !== null) {
    return probeResult
  }
  
  // 正在探测中，等待结果
  if (probePromise) {
    return probePromise
  }
  
  // 开始探测
  console.log(`[NetworkProbe] 开始探测 ${S3_HOST}...`)
  probePromise = probe()
  probeResult = await probePromise
  probePromise = null
  
  console.log(`[NetworkProbe] ${S3_HOST} ${probeResult ? '可达 ✓' : '不可达 ✗'}`)
  return probeResult
}

/**
 * 重置探测结果（用于测试）
 */
export function resetProbeResult(): void {
  probeResult = null
  probePromise = null
}
