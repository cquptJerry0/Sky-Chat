/**
 * Auth Module - 认证模块统一导出
 * 
 * 集中管理所有认证相关的导出：
 * - NextAuth实例
 * - 认证辅助函数
 * - 认证配置
 */

export { handlers, auth, signIn, signOut } from './auth'
export { authConfig } from './auth.config'

