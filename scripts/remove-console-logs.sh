#!/bin/bash

# 移除所有 console.log，但保留 console.error 和 console.warn

echo "🧹 开始清理 console.log..."

# 查找所有包含 console.log 的文件
files=$(grep -rl "console\.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next .)

count=0
for file in $files; do
  # 跳过 seed.ts（开发工具）
  if [[ "$file" == *"seed.ts"* ]]; then
    echo "⏭️  跳过: $file (开发工具)"
    continue
  fi
  
  # 删除 console.log 行（包括多行）
  # 匹配: console.log(...) 或 console.log(
  sed -i '' '/console\.log(/d' "$file"
  
  echo "✅ 清理: $file"
  ((count++))
done

echo ""
echo "🎉 完成！共清理 $count 个文件"
echo ""
echo "保留的日志："
echo "  - console.error (错误日志)"
echo "  - console.warn (警告日志)"

