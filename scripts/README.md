# Scripts 脚本说明

## 清除 Console Logs

### 自动清除（生产构建）

在生产环境构建时，Next.js 会自动移除所有 `console.log`，但保留 `console.error` 和 `console.warn`。

```bash
pnpm build
```

配置位置：`next.config.ts`

```typescript
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'], // 保留 console.error 和 console.warn
  } : false,
}
```

### 手动清除（开发阶段）

使用脚本手动清除代码中的 `console.log`：

#### 1. 预览模式（不修改文件）

查看哪些文件包含 `console.log`：

```bash
pnpm run clean:logs
```

输出示例：
```
🔍 扫描 console.log...

📁 扫描 125 个文件

🎯 找到 3 个 console.log:

📄 app/page.tsx
   Line 42: console.log('User logged in:', user)

📄 features/chat/components/ChatInput/index.tsx
   Line 15: console.log('Sending message:', message)

💡 提示：使用 --write 参数来实际删除这些 console.log
   pnpm run clean:logs --write
```

#### 2. 执行模式（实际删除）

实际删除代码中的 `console.log`：

```bash
pnpm run clean:logs --write
```

输出示例：
```
🧹 开始清除 console.log...

✅ 完成！
   - 修改了 2 个文件
   - 移除了 3 个 console.log
```

### 配置说明

脚本配置位于 `scripts/remove-console-logs.ts`：

```typescript
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
```

### 注意事项

1. **保留的 console 方法**：
   - ✅ `console.error` - 保留
   - ✅ `console.warn` - 保留
   - ❌ `console.log` - 移除
   - ❌ `console.info` - 移除
   - ❌ `console.debug` - 移除

2. **排除的文件**：
   - 数据库种子文件（`seed.ts`）
   - 脚本文件（`scripts/**`）
   - 注释中的 `console.log`

3. **建议使用场景**：
   - 提交代码前清理调试日志
   - 代码审查前清理临时日志
   - 定期清理累积的调试代码

4. **不建议使用场景**：
   - 不要在有未提交更改时使用 `--write`
   - 不要在不了解影响的情况下批量删除

### 最佳实践

1. **开发阶段**：
   - 使用 `console.log` 进行调试
   - 提交前运行 `pnpm run clean:logs` 检查
   - 确认后运行 `pnpm run clean:logs --write` 清理

2. **生产环境**：
   - 依赖 Next.js 自动清除（`pnpm build`）
   - 无需手动清理

3. **关键日志**：
   - 使用 `console.error` 记录错误
   - 使用 `console.warn` 记录警告
   - 这些不会被清除

