import NextAuth from 'next-auth'
import { authConfig } from '@/server/auth/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLandingPage = req.nextUrl.pathname === '/'

  if (isLandingPage && isLoggedIn) {
    return Response.redirect(new URL('/chat', req.nextUrl))
  }
})

export const config = {
  // 仅匹配根路径
  matcher: ['/'],
}

