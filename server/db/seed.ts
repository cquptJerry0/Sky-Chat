/**
 * 数据库 Seed 脚本
 * 
 * 初始化 admin 测试账号
 * 运行命令: pnpm db:seed
 * 
 * 测试账号信息：
 * 用户名: admin
 * 密码: admin
 */

import { prisma } from './client'

async function main() {
  console.log('🌱 开始 seeding...')

  // 测试账号 - 用户名: admin, 密码: admin
  // 密码hash: $2b$10$ZZDSvqWx0BzGArNRULYake0KFEWE674VJEzhM0EJouYuA9pfEAgo.
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: '$2b$10$ZZDSvqWx0BzGArNRULYake0KFEWE674VJEzhM0EJouYuA9pfEAgo.',
      apiKey: process.env.SILICONFLOW_API_KEY || null,
    },
  })

  console.log('✅ 创建测试账号:', {
    id: admin.id,
    username: admin.username,
    createdAt: admin.createdAt,
  })

  console.log('🎉 Seeding 完成!')
  console.log('\n📝 测试账号信息:')
  console.log('   用户名: admin')
  console.log('   密码: admin')
  console.log('\n⚠️  请在生产环境中删除此账号或修改密码!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

