/**
 * 数据库 Seed 脚本
 * 
 * 初始化 admin 用户
 * 运行命令: pnpm db:seed
 */

import { prisma } from './client'
import { hashPassword } from '../auth/password'

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const hashedPassword = await hashPassword(adminPassword)
  const apiKey = process.env.SILICONFLOW_API_KEY || ''

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      apiKey: apiKey || undefined,
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      apiKey: apiKey || undefined,
    },
  })

  console.log('Admin user created:', admin.username)
  console.log('API Key configured:', apiKey ? 'Yes' : 'No')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

