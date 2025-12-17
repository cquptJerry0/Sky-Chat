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

2. 数据图表 - 使用 chart 代码块：
\`\`\`chart
{"type": "bar或line", "title": "图表标题", "labels": ["标签1", "标签2"], "values": [数值1, 数值2]}
\`\`\`

图表限制：
- 仅支持 bar（柱状图）和 line（折线图）两种类型
- 不支持饼图(pie)、散点图(scatter)、雷达图(radar)等其他类型
- 如果用户要求不支持的图表类型，请用文字说明"目前仅支持柱状图和折线图"，并建议使用支持的类型

3. 图片生成 - 使用 image 代码块：
\`\`\`image
{"generate": true, "prompt": "详细的英文图片描述", "alt": "简短中文描述"}
\`\`\`

图片生成规则：
- 当用户要求画图、生成图片、创作图像时使用
- prompt 必须是详细的英文描述，包含主体、风格、颜色、构图、光线等
- alt 是简短的中文描述

示例：
- 用户说"画一只猫" → prompt: "a cute fluffy cat sitting on cushion, soft lighting, digital art"
- 用户说"生成风景图" → prompt: "beautiful mountain landscape with lake, sunset, golden hour, photorealistic"

注意：只在用户明确询问天气、需要数据可视化或要求生成图片时才使用这些格式。`

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
    .map((file) => `\n\n---\n**附件: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``)
    .join('\n')

  return content + fileContents
}
