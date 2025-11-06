import { getModelById } from '@/lib/constants/models'

export async function POST(req: Request) {
  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json(
      { error: 'SILICONFLOW_API_KEY not configured' },
      { status: 500 }
    )
  }

  const {
    message,
    model = 'Qwen/Qwen2.5-7B-Instruct',
    enableThinking = false,
    thinkingBudget = 4096,
    tools,
  } = await req.json()

  if (!message?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  const modelInfo = getModelById(model)

  try {
    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. 你是一个友好的 AI 助手。',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: enableThinking || modelInfo?.isReasoningModel ? 4096 : 1024,
    }

    // Reasoning 模型：只用 thinking_budget
    if (modelInfo?.isReasoningModel) {
      requestBody.thinking_budget = thinkingBudget
    }
    // 普通模型支持思考开关：用 enable_thinking + thinking_budget
    else if (enableThinking && modelInfo?.supportsThinkingToggle) {
      requestBody.enable_thinking = true
      requestBody.thinking_budget = thinkingBudget
    }

    // 如果提供了 tools，添加到请求中
    if (tools && Array.isArray(tools) && tools.length > 0) {
      requestBody.tools = tools
    }

    const siliconResponse = await fetch(
      'https://api.siliconflow.cn/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!siliconResponse.ok) {
      const errorText = await siliconResponse.text()
      throw new Error(
        `SiliconFlow API error: ${siliconResponse.status} - ${errorText}`
      )
    }

    const reader = siliconResponse.body?.getReader()
    if (!reader) {
      throw new Error('No stream available')
    }

    const sessionId = Date.now().toString()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    // 实时转发流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // 发送完成消息
              const completeData = JSON.stringify({
                type: 'complete',
                sessionId,
              })
              controller.enqueue(encoder.encode(`data: ${completeData}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // 按行分割，但保留最后一行（可能不完整）
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta

                  // 处理 reasoning_content (thinking)
                  if (delta?.reasoning_content) {
                    const thinkingData = JSON.stringify({
                      type: 'thinking',
                      content: delta.reasoning_content,
                      sessionId,
                    })
                    controller.enqueue(encoder.encode(`data: ${thinkingData}\n\n`))
                  }

                  // 处理 content (answer)
                  if (delta?.content) {
                    const answerData = JSON.stringify({
                      type: 'answer',
                      content: delta.content,
                      sessionId,
                    })
                    controller.enqueue(encoder.encode(`data: ${answerData}\n\n`))
                  }

                  // 处理 tool_calls
                  if (delta?.tool_calls) {
                    const toolData = JSON.stringify({
                      type: 'tool_calls',
                      tool_calls: delta.tool_calls,
                      sessionId,
                    })
                    controller.enqueue(encoder.encode(`data: ${toolData}\n\n`))
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          controller.error(error)
        }
      },
      cancel() {
        reader.cancel()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-ID': sessionId,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Chat API error:', errorMessage)
    return Response.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
