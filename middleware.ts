/**
 * Next.js Middleware
 * 
 * 使用 next-auth v4 的 getToken 进行认证检查
 */

import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // next-auth v4 的 getToken 需要类型断言
  const token = await getToken({ 
    req: request as Parameters<typeof getToken>[0]['req'], 
    secret: process.env.AUTH_SECRET 
  })
  
  const isLoggedIn = !!token
  const { pathname } = request.nextUrl

  // 已登录用户访问首页，重定向到 /chat
  if (pathname === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // 未登录用户访问 /chat，重定向到首页
  if (pathname.startsWith('/chat') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/chat/:path*'],
}
