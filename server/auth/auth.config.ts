/**
 * NextAuth.js Configuration (Edge Compatible)
 *
 * 此文件仅包含纯 JS 配置，不依赖 Node.js API 或 Prisma。
 * 用于 Middleware 和其他 Edge Runtime 环境。
 *
 * 注意：Credentials Provider 的 authorize 逻辑因依赖 bcrypt 和 prisma，
 * 已移动到 server/auth/auth.ts 中。
 */

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'

export const authConfig = {
  trustHost: true, // 修复 NextAuth 5.0 beta 与 Next.js 16 的兼容性问题

  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // GitHub OAuth
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
    
    // 邮箱密码登录（仅配置骨架，逻辑在 auth.ts 中合并）
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // 这里是一个空的 authorize 函数，实际逻辑会在 auth.ts 中被覆盖
      // Middleware 不需要执行 authorize，所以这是安全的
      async authorize() {
          return null
      },
    }),
  ],
  
  pages: {
    signIn: '/',
  },
  
  // Middleware 需要的回调，这里不涉及数据库操作
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnChat = nextUrl.pathname.startsWith('/chat')
      
      // 这里只做简单的路由保护逻辑，更复杂的逻辑在 middleware.ts 中处理
      if (isOnChat) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      }
          return true
    },
    
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig
