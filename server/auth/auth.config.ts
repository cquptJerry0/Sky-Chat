/**
 * NextAuth.js Configuration
 * 
 * OAuth2认证配置：
 * - Google OAuth
 * - GitHub OAuth
 * - Credentials (邮箱/密码备选)
 * 
 * @see https://authjs.dev/getting-started/installation
 */

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/client'

export const authConfig = {
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
    }),
    
    // 邮箱密码登录（备选）
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  
  pages: {
    signIn: '/',  // 自定义登录页（使用LoginDialog）
  },
  
  callbacks: {
    async signIn({ user, account }) {
      // ✅ 方案C：取消自动关联
      // 每个 OAuth 提供商和邮箱密码都是独立账号
      // Prisma Adapter 会自动处理账号创建和关联
      // 不再通过邮箱自动合并账号
      
      // 仅对 Credentials 登录做邮箱验证
      if (account?.provider === 'credentials' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        
        if (existingUser) {
          // Credentials 登录使用已存在的邮箱用户
          user.id = existingUser.id
        }
      }
      
      return true
    },
    
    async session({ session, token }) {
      // 添加userId到session
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
    maxAge: 7 * 24 * 60 * 60, // 7天
  },
  
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig

