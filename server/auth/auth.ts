/**
 * NextAuth.js Core (Node.js Environment)
 * 
 * 导出 NextAuth 实例。
 * 这里合并了 Edge 兼容的配置 (auth.config.ts) 和需要 Node.js 环境的逻辑 (Prisma, bcrypt)。
 */

import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db/client'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  providers: [
    ...authConfig.providers.filter((p) => p.id !== 'credentials'), // 移除配置中的空 Credentials
    
    // 重新添加带有完整逻辑的 Credentials Provider
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
  callbacks: {
    ...authConfig.callbacks,
    // 这里的 signIn 回调包含数据库操作，必须放在 auth.ts 中
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
  }
})
