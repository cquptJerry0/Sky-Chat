/**
 * Commitlint 配置
 * 
 * 强制使用 Conventional Commits 规范
 * 
 * 格式: <type>(<scope>): <subject>
 * 
 * 允许的 type:
 * - feat: 新功能
 * - fix: 修复 bug
 * - docs: 文档更新
 * - style: 代码格式（不影响代码运行的变动）
 * - refactor: 重构（既不是新增功能，也不是修改bug的代码变动）
 * - perf: 性能优化
 * - test: 增加测试
 * - chore: 构建过程或辅助工具的变动
 * - revert: 回滚
 * 
 * 示例:
 * - feat(chat): 添加语音输入功能
 * - fix(auth): 修复登录状态丢失问题
 * - docs: 更新 README
 * - refactor(store): 重构状态管理
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复
        'docs',     // 文档
        'style',    // 格式
        'refactor', // 重构
        'perf',     // 性能
        'test',     // 测试
        'chore',    // 构建/工具
        'revert',   // 回滚
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
}

