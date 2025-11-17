# Sky Chat

AI 聊天应用，支持多模型对话、语音交互、文件上传。

## 技术栈

- **框架**: Next.js 16 (App Router + Turbopack)
- **语言**: TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: Auth.js v5 (Google/GitHub/邮箱登录)
- **状态管理**: Zustand
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: 硅基流动 API (对话/语音/思考模式)

## 功能

### 对话
- 流式响应（SSE）
- 多模型切换（Qwen/DeepSeek）
- 思考模式（推理过程可视化）
- 会话管理（创建/删除/重命名/置顶）
- 消息操作（复制/朗读/重试）

### 语音
- **语音输入**: 录音转文字（SenseVoice）
- **语音输出**: 文字转语音（CosyVoice2，8 种音色）
- 语音选择持久化

### 文件
- 上传 `.txt` / `.md` 文件（最大 1MB）
- 后端读取内容并加入对话上下文

### 其他
- 深色模式
- 导出对话（Markdown）
- 响应式布局

## 开发

### 环境要求

- Node.js 18+
- PostgreSQL
- pnpm

### 安装

```bash
pnpm install
```

### 配置

创建 `.env.local`：

```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/skychat"

# Auth.js
AUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST="true"

# OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# 硅基流动 API
SILICONFLOW_API_KEY="your-api-key"
```

### 数据库

```bash
# 生成 Prisma Client
pnpm prisma generate

# 运行迁移
pnpm prisma migrate dev

# 填充测试数据（可选）
pnpm db:seed
```

### 运行

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

## 脚本

```bash
# 清除 console.log（预览）
pnpm run clean:logs

# 清除 console.log（执行）
pnpm run clean:logs --write

# 数据库管理
pnpm db:studio    # Prisma Studio
pnpm db:seed      # 填充测试数据
pnpm db:reset     # 重置数据库
```

## 项目结构

```
app/                    # Next.js App Router
├── api/               # API 路由
├── auth/              # 认证页面
└── chat/              # 聊天页面

components/            # 全局组件
├── ui/               # shadcn/ui 组件
└── ...

features/              # 功能模块
├── auth/             # 认证
├── chat/             # 对话
├── conversation/     # 会话管理
├── share/            # 分享
└── voice/            # 语音

lib/                   # 工具库
├── hooks/            # React Hooks
├── services/         # API 服务
└── utils/            # 工具函数

server/                # 服务端代码
├── auth/             # Auth.js 配置
├── db/               # 数据库
└── services/         # 业务逻辑

prisma/                # Prisma 配置
└── schema.prisma     # 数据库模型
```

## 编码规范

参考 `.augment/rules/imported/common.md`：

- 不提前封装（2-3 次重复后再抽象）
- 最小化日志（只记录关键错误）
- 代码中不使用 emoji
- 注释解释"为什么"而非"做什么"
- 组件命名：自定义组件用 PascalCase 文件夹，UI 库用 kebab-case

## License

MIT
