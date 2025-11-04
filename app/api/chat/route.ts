import { Observable, from, concatMap, delay } from 'rxjs'
import { StreamManager } from '@/lib/stream-manager'

export async function POST(req: Request) {
  if (!process.env.SILICONFLOW_API_KEY) {
    return Response.json(
      { error: 'SILICONFLOW_API_KEY not configured' },
      { status: 500 }
    )
  }

  const {
    message,
    resumeSessionId,
    enableThinking = false,
    thinkingBudget = 4096,
    tools,
  } = await req.json()

  if (!message?.trim() && !resumeSessionId) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  const encoder = new TextEncoder()
  let fullContent = ''
  let fullThinking = ''
  let toolCalls: unknown[] = []
  let startIndex = 0
  let sessionId = ''

  try {
    // 检查是否是续传请求
    if (resumeSessionId) {
      const session = StreamManager.get(resumeSessionId)
      if (session) {
        fullContent = session.fullContent
        startIndex = session.sentLength
        sessionId = resumeSessionId
      }
    }

    // 如果不是续传，调用硅基流动 API
    if (!fullContent) {
      // 根据是否启用思考模式选择模型
      const model = enableThinking
        ? 'Qwen/QwQ-32B'
        : 'Qwen/Qwen2.5-7B-Instruct'

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
        max_tokens: enableThinking ? 4096 : 1024,
      }

      // 如果启用思考模式，添加思考相关参数
      if (enableThinking) {
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

      const decoder = new TextDecoder()

      // 步骤1: 读取硅基流动的流式响应，收集完整内容
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              const message = parsed.choices?.[0]?.message

              // 处理常规内容
              const content = delta?.content || ''
              if (content) {
                fullContent += content
              }

              // 处理思考内容（reasoning_content）
              const reasoningContent = delta?.reasoning_content || ''
              if (reasoningContent) {
                fullThinking += reasoningContent
              }

              // 处理函数调用
              if (delta?.tool_calls || message?.tool_calls) {
                const calls = delta?.tool_calls || message?.tool_calls
                toolCalls = calls
              }
            } catch {
              // 忽略解析错误的行
            }
          }
        }
      }

      // 创建新会话
      sessionId = StreamManager.create(Date.now().toString(), fullContent)
    }

    // 步骤2: 用 RxJS 处理完整文本，从 startIndex 开始逐字发送（SSE 格式）
    const stream = new ReadableStream({
      start(controller) {
        let currentIndex = startIndex

        // 如果有思考内容，先发送思考内容
        if (fullThinking && enableThinking) {
          const thinkingChars = fullThinking.split('')
          const thinking$ = from(thinkingChars)

          thinking$
            .pipe(
              concatMap((char) =>
                new Observable((subscriber) => {
                  subscriber.next(char)
                  subscriber.complete()
                }).pipe(delay(10))
              )
            )
            .subscribe({
              next: (char) => {
                const data = JSON.stringify({
                  type: 'thinking',
                  content: char,
                  sessionId,
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              },
              complete: () => {
                // 思考完成，开始发送回答
                sendAnswer()
              },
              error: (err) => {
                controller.error(err)
              },
            })
        } else {
          // 没有思考内容，直接发送回答
          sendAnswer()
        }

        function sendAnswer() {
          const chars$ = from(fullContent.slice(startIndex).split(''))

          chars$
            .pipe(
              concatMap((char) =>
                new Observable((subscriber) => {
                  subscriber.next(char)
                  subscriber.complete()
                }).pipe(delay(20))
              )
            )
            .subscribe({
              next: (char) => {
                currentIndex++
                StreamManager.updateProgress(sessionId, currentIndex)

                const data = JSON.stringify({
                  type: 'answer',
                  content: char,
                  sessionId,
                  progress: currentIndex / fullContent.length,
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              },
              complete: () => {
                // 如果有函数调用，发送函数调用信息
                if (toolCalls && toolCalls.length > 0) {
                  const toolData = JSON.stringify({
                    type: 'tool_calls',
                    tool_calls: toolCalls,
                    sessionId,
                  })
                  controller.enqueue(encoder.encode(`data: ${toolData}\n\n`))
                }

                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                StreamManager.cleanup(sessionId)
                controller.close()
              },
              error: (err) => {
                controller.error(err)
              },
            })
        }
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
