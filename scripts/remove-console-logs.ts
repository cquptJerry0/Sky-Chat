#!/usr/bin/env tsx

/**
 * Remove Console Logs Script
 * 
 * 自动移除代码中的 console.log 语句
 * 保留 console.error 和 console.warn
 * 
 * 使用方法：
 * pnpm run clean:logs          # 预览将要删除的 console.log
 * pnpm run clean:logs --write  # 实际删除 console.log
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// 配置
const CONFIG = {
  // 要扫描的目录
  include: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'server/**/*.{ts,tsx}',
  ],
  // 排除的目录和文件
  exclude: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/seed.ts',           // 排除数据库种子文件
    '**/scripts/**',        // 排除脚本文件
  ],
  // 保留的 console 方法
  keepMethods: ['error', 'warn'],
}

interface LogMatch {
  file: string
  line: number
  content: string
  fullMatch: string
}

/**
 * 查找文件中的 console.log
 */
function findConsoleLogs(filePath: string): LogMatch[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const matches: LogMatch[] = []

  // 匹配 console.log(...) 但不匹配 console.error 和 console.warn
  const consoleLogRegex = /console\.log\s*\([^)]*\)/g

  lines.forEach((line, index) => {
    // 跳过注释行
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
      return
    }

    const lineMatches = line.match(consoleLogRegex)
    if (lineMatches) {
      lineMatches.forEach(match => {
        matches.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          fullMatch: match,
        })
      })
    }
  })

  return matches
}

/**
 * 移除文件中的 console.log
 */
function removeConsoleLogs(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8')
  const originalContent = content

  // 移除整行的 console.log
  content = content.replace(/^\s*console\.log\s*\([^)]*\)\s*;?\s*$/gm, '')

  // 移除行内的 console.log（保留其他代码）
  content = content.replace(/console\.log\s*\([^)]*\)\s*;?\s*/g, '')

  // 移除多余的空行（连续超过2个空行）
  content = content.replace(/\n{3,}/g, '\n\n')

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return 1
  }

  return 0
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)
  const shouldWrite = args.includes('--write')

  console.log(' 扫描 console.log...\n')

  // 获取所有文件
  const files = await glob(CONFIG.include, {
    ignore: CONFIG.exclude,
  })

  console.log(`扫描 ${files.length} 个文件\n`)

  // 查找所有 console.log
  const allMatches: LogMatch[] = []
  for (const file of files) {
    const matches = findConsoleLogs(file)
    allMatches.push(...matches)
  }

  if (allMatches.length === 0) {
    console.log('没有找到 console.log')
    return
  }

  console.log(`找到 ${allMatches.length} 个 console.log:\n`)

  // 按文件分组显示
  const groupedByFile = allMatches.reduce((acc, match) => {
    if (!acc[match.file]) {
      acc[match.file] = []
    }
    acc[match.file].push(match)
    return acc
  }, {} as Record<string, LogMatch[]>)

  Object.entries(groupedByFile).forEach(([file, matches]) => {
    console.log(` ${file}`)
    matches.forEach(match => {
      console.log(`   Line ${match.line}: ${match.content}`)
    })
    console.log()
  })

  if (shouldWrite) {
    console.log(' 开始清除 console.log...\n')

    const affectedFiles = new Set<string>()

    for (const file of Object.keys(groupedByFile)) {
      const count = removeConsoleLogs(file)
      if (count > 0) {
        affectedFiles.add(file)
      }
    }

    console.log(` 完成！`)
    console.log(`   - 修改了 ${affectedFiles.size} 个文件`)
    console.log(`   - 移除了 ${allMatches.length} 个 console.log\n`)
  } else {
    console.log(' 提示：使用 --write 参数来实际删除这些 console.log')
    console.log('   pnpm run clean:logs --write\n')
  }
}

main().catch(console.error)

