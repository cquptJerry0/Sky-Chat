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

// 导入 fetch polyfill 解决 Next.js 16 兼容性问题
import './fetch-polyfill'

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/client'

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
    signIn: '/',
  },
  
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return true
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { accounts: true },
      })

      if (!existingUser) {
        return true
      }

      const accountAlreadyLinked = existingUser.accounts.some(
        (acc: { provider: string }) => acc.provider === account?.provider
      )

      if (accountAlreadyLinked) {
        return true
      }

      if (account?.provider === 'credentials') {
        user.id = existingUser.id
        return true
      }

      const canAutoLink =
        existingUser.emailVerified ||
        account?.provider === 'google' ||
        account?.provider === 'github'

      if (canAutoLink && account) {
        try {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
          })

          user.id = existingUser.id

          if (!existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            })
          }

          return true
        } catch (error) {
          console.error('[Auth] Failed to link account:', error)
          return false
        }
      }

      return false
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

  // 修复 NextAuth 5.0 beta 与 Next.js 16 的 cookie 解析问题
  cookies: {
    state: {
      name: 'authjs.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900, // 15 分钟
      },
    },
    pkceCodeVerifier: {
      name: 'authjs.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900, // 15 分钟
      },
    },
  },

  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig

