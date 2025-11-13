#!/usr/bin/env node

/**
 * 清理所有 console.log，保留 console.error 和 console.warn
 */

const fs = require('fs');
const path = require('path');

const filesToClean = [
  'lib/stores/chat.store.ts',
  'modules/chat-input/use-chat-input.ts',
  'modules/message-list/index.tsx',
  'modules/chat-message/index.tsx',
  'app/chat/[conversationId]/page.tsx',
  'app/page.tsx',
  'app/api/chat/route.ts',
  'server/services/stream-manager.ts',
  'components/LandingPage/LandingInput.tsx',
  'components/AuthGuard/index.tsx',
  'components/Header/index.tsx',
  'lib/utils/storage.ts',
  'lib/services/sse-parser.ts',
];

function cleanFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  跳过: ${filePath} (文件不存在)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // 删除单行 console.log
  content = content.replace(/^(\s*)console\.log\([^)]*\)\s*$/gm, '');
  
  // 删除多行 console.log (简单情况)
  content = content.replace(/^(\s*)console\.log\(\s*$/gm, (match, indent) => {
    // 标记为待删除
    return `${indent}__REMOVE_START__`;
  });
  
  // 删除被标记的多行块
  const lines = content.split('\n');
  const cleaned = [];
  let removing = false;
  let bracketCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('__REMOVE_START__')) {
      removing = true;
      bracketCount = 1;
      continue;
    }
    
    if (removing) {
      // 计算括号
      for (const char of line) {
        if (char === '(') bracketCount++;
        if (char === ')') bracketCount--;
      }
      
      if (bracketCount === 0) {
        removing = false;
      }
      continue;
    }
    
    cleaned.push(line);
  }
  
  content = cleaned.join('\n');
  
  // 清理多余的空行（最多保留2个连续空行）
  content = content.replace(/\n{4,}/g, '\n\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ 清理: ${filePath}`);
  } else {
    console.log(`⏭️  跳过: ${filePath} (无需清理)`);
  }
}

console.log('🧹 开始清理 console.log...\n');

filesToClean.forEach(cleanFile);

console.log('\n🎉 完成！');
console.log('\n保留的日志：');
console.log('  - console.error (错误日志)');
console.log('  - console.warn (警告日志)');

