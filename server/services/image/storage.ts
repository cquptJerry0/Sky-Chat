/**
 * 图片存储服务
 *
 * 负责下载远程图片并保存到本地 public/generated 目录
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'

/**
 * 存储的图片信息
 */
export interface StoredImage {
  /** 本地访问 URL（相对路径） */
  localUrl: string
  /** 文件名 */
  filename: string
  /** 完整文件路径 */
  filepath: string
}

/** 
 * 图片存储目录
 * Docker/生产环境: /app/public/generated（绝对路径）
 * 开发环境: public/generated（相对路径）
 */
const STORAGE_DIR = process.env.IMAGE_STORAGE_DIR || (
  process.env.NODE_ENV === 'production' ? '/app/public/generated' : 'public/generated'
)

/** 
 * 图片 URL 前缀
 * 开发环境: /generated
 * 生产环境: 通过 IMAGE_URL_PREFIX 环境变量配置
 */
const URL_PREFIX = process.env.IMAGE_URL_PREFIX || '/generated'

/**
 * 生成唯一文件名
 *
 * 格式: {timestamp}-{randomId}.png
 *
 * @returns 唯一文件名
 */
export function generateFilename(): string {
  const timestamp = Date.now()
  const randomId = randomBytes(4).toString('hex')
  return `${timestamp}-${randomId}.png`
}

/**
 * 确保存储目录存在
 */
async function ensureStorageDir(): Promise<void> {
  // 生产环境用绝对路径，开发环境用相对路径
  const fullPath = STORAGE_DIR.startsWith('/') ? STORAGE_DIR : path.join(process.cwd(), STORAGE_DIR)
  if (!existsSync(fullPath)) {
    await mkdir(fullPath, { recursive: true })
  }
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1秒

/**
 * 带重试的 fetch
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      // 非网络错误，不重试
      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      const isLast = i === retries - 1
      if (isLast) throw error
      console.warn(`[Storage] 下载失败，${RETRY_DELAY}ms 后重试 (${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, RETRY_DELAY))
    }
  }
  throw new Error('重试次数耗尽')
}

/**
 * 下载远程图片并保存到本地
 *
 * @param remoteUrl - 远程图片 URL
 * @returns 存储的图片信息
 * @throws Error 当下载或保存失败时（包含清晰的错误信息）
 */
export async function downloadAndSave(remoteUrl: string): Promise<StoredImage> {
  // 确保目录存在
  await ensureStorageDir()

  // 下载图片（带重试）
  let response: Response
  try {
    response = await fetchWithRetry(remoteUrl)
  } catch (error) {
    // 返回清晰的错误信息，告诉 AI 是本次网络问题
    const msg = error instanceof Error ? error.message : '未知错误'
    throw new Error(`图片下载失败（网络问题，本次请求不可用，用户可稍后重试）: ${msg}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 生成文件名和路径
  const filename = generateFilename()
  const filepath = STORAGE_DIR.startsWith('/') ? path.join(STORAGE_DIR, filename) : path.join(process.cwd(), STORAGE_DIR, filename)
  const localUrl = `${URL_PREFIX}/${filename}`

  // 保存文件
  await writeFile(filepath, buffer)

  return {
    localUrl,
    filename,
    filepath,
  }
}
