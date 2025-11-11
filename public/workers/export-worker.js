/**
 * Export Worker - 多线程导出处理
 * 
 * 技术亮点：
 * - Web Worker 避免主线程阻塞
 * - 处理大数据量 Markdown 格式化
 * - 支持进度报告
 */

self.addEventListener('message', async (event) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'EXPORT_MARKDOWN':
        await exportMarkdown(data)
        break
      
      case 'EXPORT_BATCH':
        await exportBatch(data)
        break
      
      default:
        throw new Error(`Unknown task type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    })
  }
})

/**
 * 导出单个会话为 Markdown
 */
async function exportMarkdown({ conversation, messages, config }) {
  self.postMessage({ type: 'PROGRESS', progress: 0, message: '开始处理...' })

  let content = `# ${conversation.title}\n\n`
  
  if (config.includeMetadata) {
    content += `> 导出时间：${new Date().toLocaleString()}\n`
    content += `> 消息数量：${messages.length}\n\n`
  }

  content += `---\n\n`

  const total = messages.length
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const role = msg.role === 'user' ? '👤 用户' : '🤖 助手'
    
    content += `### ${role}\n`
    content += `*${new Date(msg.createdAt).toLocaleString()}*\n\n`
    
    if (config.includeThinking && msg.thinking) {
      content += `<details>\n<summary>思考过程</summary>\n\n`
      content += `${msg.thinking}\n\n`
      content += `</details>\n\n`
    }
    
    content += `${msg.content}\n\n`
    content += `---\n\n`

    // 报告进度
    if (i % 10 === 0 || i === total - 1) {
      const progress = Math.round((i + 1) / total * 100)
      self.postMessage({
        type: 'PROGRESS',
        progress,
        message: `正在处理消息 ${i + 1}/${total}`
      })
    }
  }

  // 完成
  const blob = new Blob([content], { type: 'text/markdown' })
  self.postMessage({
    type: 'COMPLETE',
    result: {
      blob,
      filename: `${conversation.title.replace(/[^\w\s-]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`
    }
  })
}

/**
 * 批量导出
 */
async function exportBatch({ conversations, config }) {
  self.postMessage({ type: 'PROGRESS', progress: 0, message: '开始批量处理...' })

  const total = conversations.length
  const results = []

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i]
    
    // 处理单个会话
    let content = `# ${conv.title}\n\n`
    
    for (const msg of conv.messages) {
      const role = msg.role === 'user' ? '👤 用户' : '🤖 助手'
      content += `### ${role}\n`
      content += `${msg.content}\n\n---\n\n`
    }

    results.push(content)

    // 报告进度
    const progress = Math.round((i + 1) / total * 100)
    self.postMessage({
      type: 'PROGRESS',
      progress,
      message: `正在处理会话 ${i + 1}/${total}`
    })
  }

  // 合并所有内容
  const mergedContent = results.join('\n\n========== 会话分隔 ==========\n\n')
  const blob = new Blob([mergedContent], { type: 'text/markdown' })

  // 生成更合理的文件名
  const date = new Date().toISOString().split('T')[0]
  const count = conversations.length
  const filename = count === 1 
    ? `${conversations[0].title}_${date}.md`
    : `Sky_Chat_${count}个会话_${date}.md`
  
  self.postMessage({
    type: 'COMPLETE',
    result: {
      blob,
      filename
    }
  })
}
