# ================================
# 阶段1: 安装依赖
# ================================
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

# ================================
# 阶段2: 构建
# ================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client（构建时不需要真实连接，只需要 URL 格式）
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN npx prisma generate

# 构建 Next.js（standalone 模式）
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ================================
# 阶段3: 运行
# ================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建缓存目录并设置权限
RUN mkdir -p /app/.next/cache/images && chown -R nextjs:nodejs /app

# 复制构建产物
COPY --from=builder /app/public ./public

# 确保 generated 目录存在且可写（用于图片存储）
RUN mkdir -p /app/public/generated && chown -R nextjs:nodejs /app/public/generated
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制 Prisma 相关文件（迁移用）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
