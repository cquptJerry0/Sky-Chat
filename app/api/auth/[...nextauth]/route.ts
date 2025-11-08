/**
 * NextAuth.js API Routes
 * 
 * 处理所有OAuth2认证相关的API请求
 * 
 * @route GET/POST /api/auth/*
 */

import { handlers } from '@/server/auth/auth'

export const { GET, POST } = handlers

