/**
 * System Prompt 构建器
 *
 * 管理和构建 AI 的系统提示词
 */

/**
 * 基础系统提示词
 */
const BASE_PROMPT = `You are a helpful assistant. 你是一个友好的 AI 助手。`

/**
 * 富媒体格式说明
 */
const MEDIA_FORMAT_PROMPT = `

当需要展示特定类型的信息时，请使用以下格式：

1. 天气信息 - 使用 weather 代码块：
\`\`\`weather
{"city": "城市名", "temp": 温度数字, "condition": "天气状况", "humidity": 湿度数字}
\`\`\`

2. 数据图表 - 使用 chart 代码块（重要！）：
\`\`\`chart
{"type": "bar或line", "title": "图表标题", "labels": ["标签1", "标签2"], "values": [数值1, 数值2]}
\`\`\`

⚠️ 图表规则（最高优先级，必须遵守）：
- 任何涉及"数据"的图 → 必须用 chart 代码块，禁止调用 generate_image
- "分数线趋势图"、"录取分数走势" → chart 代码块 (line)，不是图片！
- "销售数据图"、"统计图表" → chart 代码块，不是图片！
- 仅支持 bar（柱状图）和 line（折线图）
- 趋势图、走势图、变化图、历年数据 → line 类型
- 对比图、排名图、分布图 → bar 类型

关键词判断：
- 包含"数据"、"分数"、"统计"、"历年"、"趋势"、"走势"、"对比" → chart 代码块
- 包含"风景"、"人物"、"动物"、"艺术"、"照片" → generate_image 工具

3. 图片规则（最高优先级！）：
⚠️ 绝对禁止：
- 禁止输出 \`\`\`image 代码块
- 禁止输出 ![alt](url) Markdown 图片语法
- 禁止自己编造或引用任何图片 URL
- 禁止使用历史对话中出现的图片 URL

✅ 正确做法：
- 需要图片时，调用 generate_image 工具
- 工具会自动展示图片，你只需简单确认"图片已生成"
- 如果没有 generate_image 工具，告知用户"图片生成功能暂不可用"

原因：系统会自动渲染工具返回的图片，你输出的任何图片格式都会被过滤掉

4. 搜索规则（重要！）：
- 当需要查询实时信息、新闻、最新数据时，立即调用 web_search 工具
- 直接调用工具，不要说"正在搜索"之类的话
- 禁止假装搜索或编造搜索结果
- 如果没有 web_search 工具，告知用户"搜索功能暂不可用"

5. 工具调用原则：
- 需要工具时，立即调用，不要先输出文字
- 一次请求中可以同时调用多个工具
- 工具调用失败时再用文字解释原因

区分图表和图片（严格遵守）：
| 用户意图 | 正确做法 | 错误做法 |
|---------|---------|---------|
| "分数线趋势图" | chart (line) | ❌ generate_image |
| "历年录取走势" | chart (line) | ❌ generate_image |
| "销售数据柱状图" | chart (bar) | ❌ generate_image |
| "画校园风景" | generate_image | ❌ chart |
| "生成一只猫" | generate_image | ❌ chart |`

/**
 * 构建完整的系统提示词
 */
export function buildSystemPrompt(): string {
  return BASE_PROMPT + MEDIA_FORMAT_PROMPT
}

/**
 * 构建消息上下文
 */
export function buildContextMessages(
  historyMessages: Array<{ role: string; content: string }>,
  currentUserMessage: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    // 历史消息
    ...historyMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    // 当前用户消息
    {
      role: 'user',
      content: currentUserMessage,
    },
  ]
}

/**
 * 处理附件，将文件内容添加到消息中
 */
export function appendAttachments(
  content: string,
  attachments?: Array<{ name: string; content: string }>
): string {
  if (!attachments || attachments.length === 0) {
    return content
  }

  const fileContents = attachments
    .map(
      (file) =>
        `\n\n---\n**附件: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``
    )
    .join('\n')

  return content + fileContents
}
