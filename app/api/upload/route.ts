/**
 * 文件上传 API
 * POST /api/upload - 上传文件并读取内容
 */

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/server/auth/utils'

export async function POST(req: Request) {
  try {
    // 验证用户身份
    await getCurrentUserId()

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const validTypes = ['text/plain', 'text/markdown']
    const validExtensions = ['.txt', '.md']
    const hasValidType = validTypes.includes(file.type)
    const hasValidExtension = validExtensions.some(ext => file.name.endsWith(ext))

    if (!hasValidType && !hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .txt and .md files are supported.' },
        { status: 400 }
      )
    }

    // 验证文件大小（最大 1MB）
    const MAX_SIZE = 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 1MB.' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const content = await file.text()

    // 确定文件类型
    const fileType = file.name.endsWith('.md') ? 'md' : 'txt'

    // 返回文件信息
    return NextResponse.json({
      name: file.name,
      type: fileType,
      size: file.size,
      content,
    })
  } catch (error) {
    console.error('Upload error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

