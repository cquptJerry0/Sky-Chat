import { Observable } from 'rxjs'
import { delay, concatMap, from } from 'rxjs'

export async function POST(req: Request) {
  const { message } = await req.json()

  const encoder = new TextEncoder()

  // 模拟 AI 回复
  const response = `你说："${message}"。这是一个使用 RxJS 实现的模拟 AI 回复，展示打字机效果。我可以帮你回答各种问题，进行对话交流...`

  // 使用 RxJS 创建字符流
  const chars$ = from(response.split(''))

  const stream = new ReadableStream({
    async start(controller) {
      // 订阅 RxJS Observable
      chars$
        .pipe(
          // 逐字符延迟 30ms
          concatMap((char) =>
            new Observable((subscriber) => {
              subscriber.next(char)
              subscriber.complete()
            }).pipe(delay(30))
          )
        )
        .subscribe({
          next: (char) => {
            // 发送 SSE 格式数据
            const data = JSON.stringify({ content: char })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          },
          complete: () => {
            // 发送结束标记
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
          error: (err) => {
            console.error('Stream error:', err)
            controller.error(err)
          },
        })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
