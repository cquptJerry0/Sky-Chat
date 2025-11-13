---
type: "always_apply"
---

看了你的编码规范，确实缺少注释相关的规范。我建议在第 3 和第 4 之间插入一个"注释规范"章节。以下是优化后的版本：

```markdown
---
alwaysApply: true
---
# 写完代码后不准创造markdown文档
# Sky Chat 编码行为规范

## 1. 禁止提前封装

**规则**: 必须出现 2-3 次以上，才能考虑抽象和封装

**原则**:
- 先写直接可用的代码，不要为"可能的复用"而设计common
- 等待真实的重复出现后再重构
- 避免过度设计导致代码复杂性增加

**错误示例**:
```typescript
// 提前为了可能的复用而创建复杂接口
interface DataTransformer<T, R> {
  transform(data: T): R
  validate(data: T): boolean
  cache(key: string): void
}
```

**正确示例**:
```typescript
// 先写出可用的代码
async function processMessage(message: string) {
  return await sendToGroq(message)
}
```

---

## 2. 禁止随意 Log

**规则**: 只在关键业务流程点记录日志，避免过度日志

**日志级别使用**:
- `console.error()` - 错误导致功能失败
- `console.warn()` - 警告但功能继续
- `console.log()` - 重要的业务事件（仅开发阶段）

**允许的日志点**:
- API 调用的成功/失败
- 关键错误和异常
- 用户操作的关键节点

**禁止的做法**:
- 不要在循环中记录日志
- 不要记录所有中间变量值
- 不要记录过于详细的调试信息
- 生产环境移除所有 console.log()

**正确示例**:
```typescript
async function fetchChat(message: string) {
  try {
    const response = await fetch('/api/chat', { ... })
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch chat:', error)
    throw error
  }
}
```

---

## 3. 禁止表情包

**规则**: 代码中不要使用任何表情符号

**禁止范围**:
- 代码注释中
- 字符串字面量中
- 变量名中

**错误示例**:
```typescript
// 启动系统 ✅ (不要)
const message = '欢迎使用 Sky Chat 🚀' (不要)
console.log('Success ✓') (不要)
```

**正确示例**:
```typescript
// Start chat system
const message = 'Welcome to Sky Chat'
console.log('Chat initialized')
```

**文档中允许使用表情** (仅限 .md 文件):
- README.md
- 设计文档
- 用户指南

---

## 4. 注释规范

**规则**: 代码应当自解释，注释用于解释"为什么"而非"做什么"

### 4.1 何时需要注释

**必须注释的场景**:
- 复杂的业务逻辑或算法
- 非常规的解决方案或 workaround
- 重要的性能考虑
- 关键的边界条件或特殊情况
- 公共 API 和函数接口

**不需要注释的场景**:
- 显而易见的代码
- 重复描述代码本身
- 过时的注释（删除它们）

### 4.2 注释风格

**函数/方法注释**:
```typescript
/**
 * 发送消息到 AI 模型并处理流式响应
 * 注意: 使用 SSE 处理长时间运行的请求，需要手动管理连接
 */
async function sendMessage(content: string): Promise<ReadableStream> {
  // ...
}
```

**业务逻辑注释**:
```typescript
// 保持消息历史在 20 条以内，避免 token 超限
const recentMessages = messages.slice(-20)

// 特殊处理: Safari 不支持 ReadableStream.from()
if (isSafari) {
  return createPolyfillStream(data)
}
```

**禁止的注释方式**:
```typescript
// 错误: 重复描述代码
// 设置 count 为 0
let count = 0

// 错误: 无意义的注释
// 调用函数
fetchData()

// 错误: 注释掉的代码（应该删除或使用版本控制）
// const oldLogic = () => { ... }
```

### 4.3 TODO 注释规范

**格式**: `// TODO(作者): 描述 + 原因/计划`

```typescript
// TODO(jerry): 添加请求重试机制，当前网络错误直接失败
async function fetchData() {
  // ...
}

// TODO(jerry): 性能优化 - 考虑使用虚拟滚动处理大量消息
function MessageList() {
  // ...
}
```

### 4.4 类型注释

**依赖类型系统，减少注释**:
```typescript
// 好: 类型已经说明了一切
interface UserMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 不需要: /* 用户消息 ID */
const messageId: string = '123'
```

### 4.5 注释语言

**规则**: 统一使用中文或英文，项目内保持一致

**推荐**: 中文注释用于业务逻辑，英文注释用于技术细节

```typescript
// 业务: 处理用户发送的消息
async function handleUserMessage(message: string) {
  // Technical: Debounce to prevent duplicate submissions
  await debounce(send, 300)
}
```

---

## 5. 禁止随意生成 Markdown

**规则**: 编码时集中编码，设计时集中设计，避免混杂

**禁止的做法**:
- 不要在编码中途突然生成大量文档
- 不要先写设计文档再编码（除非明确要求）
- 不要重复描述方案和编码

**正确做法**:
- 需要设计时，先完成设计
- 编码时，专注实现功能
- 文档更新作为独立任务

---

## 6. 组件文件命名规范
### 工具用
kebab-case
### 自定义组件（大写文件夹 + index.tsx）

**结构**:
```
components/
├── ChatInput/
│   └── index.tsx
├── ChatMessage/
│   └── index.tsx
├── VoiceInput/
│   └── index.tsx
└── ThemeToggle/
    └── index.tsx
```

**导入方式**:
```typescript
import { ChatInput } from '@/components/ChatInput'
import { ChatMessage } from '@/components/ChatMessage'
```

### UI 组件库（小写文件名）

**结构**:
```
components/ui/
├── button.tsx
├── input.tsx
├── badge.tsx
└── card.tsx
```

**导入方式**:
```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

---

## 7. TypeScript 规范

**类型定义**:
- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型或复杂类型
- 避免使用 `any`，必要时使用 `unknown`

**正确示例**:
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type MessageRole = 'user' | 'assistant'
```

---

## 8. React 组件规范

**函数组件**:
- 使用函数声明而非箭头函数
- Props 类型单独定义
- 导出组件使用 named export

**正确示例**:
```typescript
// components/ChatInput/index.tsx
interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  // 组件实现
}
```

---

## 9. API 路由规范

**文件结构**:
```
app/api/
├── chat/
│   └── route.ts
└── speech/
    └── route.ts
```

**错误处理**:
- 必须有 try-catch
- 返回标准的错误格式
- 记录关键错误日志

**正确示例**:
```typescript
export async function POST(req: Request) {
  try {
    const data = await req.json()
    // 业务逻辑
    return Response.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 提交代码前检查清单

- [ ] 没有提前抽象，代码直接清晰
- [ ] 没有过度的日志语句
- [ ] 没有 console.log()（生产代码）
- [ ] 没有代码中的表情符号
- [ ] 注释解释"为什么"而非"做什么"
- [ ] 没有注释掉的代码
- [ ] TODO 注释包含作者和计划
- [ ] 组件命名符合规范（自定义大写文件夹，UI 库小写）
- [ ] TypeScript 类型定义完整
- [ ] API 路由有完整的错误处理
- [ ] 没有混杂的设计和编码文档

---

**项目**: Sky Chat  
**版本**: 1.1.0  
**最后更新**: 2025-11-06
```

## 主要改进点：

1. **新增第 4 章 - 注释规范**，包含：
   - 何时需要/不需要注释
   - 注释风格指南
   - TODO 注释格式
   - 类型注释最佳实践
   - 注释语言规范

2. **更新检查清单**，添加注释相关的检查项

3. **更新版本号**为 1.1.0 和日期为 2025-11-06

你可以切换到 **agent mode** 让我直接更新文件，或者手动复制这个内容替换原文件。