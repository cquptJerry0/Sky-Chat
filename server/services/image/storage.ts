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

/** 图片存储目录（相对于项目根目录） */
const STORAGE_DIR = 'public/generated'

/** URL 前缀（用于访问） */
const URL_PREFIX = '/generated'

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
  const fullPath = path.join(process.cwd(), STORAGE_DIR)
  if (!existsSync(fullPath)) {
    await mkdir(fullPath, { recursive: true })
  }
}

/**
 * 下载远程图片并保存到本地
 *
 * @param remoteUrl - 远程图片 URL
 * @returns 存储的图片信息
 * @throws Error 当下载或保存失败时
 */
export async function downloadAndSave(remoteUrl: string): Promise<StoredImage> {
  // 确保目录存在
  await ensureStorageDir()

  // 下载图片
  const response = await fetch(remoteUrl)

  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 生成文件名和路径
  const filename = generateFilename()
  const filepath = path.join(process.cwd(), STORAGE_DIR, filename)
  const localUrl = `${URL_PREFIX}/${filename}`

  // 保存文件
  await writeFile(filepath, buffer)

  return {
    localUrl,
    filename,
    filepath,
  }
}
