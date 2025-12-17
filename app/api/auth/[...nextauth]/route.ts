/**
 * NextAuth.js v4 API Routes
 * 
 * 处理所有 OAuth2 认证相关的 API 请求
 * 
 * @route GET/POST /api/auth/*
 */

import NextAuth from 'next-auth'
import { authOptions } from '@/server/auth/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
