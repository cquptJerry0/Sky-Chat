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
      // OAuth登录时自动创建或关联账号
      if (account?.provider && account.provider !== 'credentials' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })
        
        if (existingUser) {
          // 邮箱已存在，检查是否已关联此OAuth账号
          const accountExists = existingUser.accounts.some(
            (acc) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          )
          
          if (!accountExists) {
            // 关联新的OAuth账号到现有用户
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
          }
          
          // 更新用户ID，确保session使用正确的用户
          user.id = existingUser.id
        } else {
          // 创建新用户（由 Prisma Adapter 自动处理）
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

