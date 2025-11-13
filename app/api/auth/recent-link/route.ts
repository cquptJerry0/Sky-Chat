import { NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { prisma } from '@/server/db/client'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ recentLink: null })
    }

    const recentAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        type: 'oauth',
      },
      orderBy: {
        id: 'desc',
      },
      take: 1,
    })

    if (!recentAccount) {
      return NextResponse.json({ recentLink: null })
    }

    const accountCreatedAt = new Date(parseInt(recentAccount.id.substring(0, 8), 16))
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    if (accountCreatedAt > fiveMinutesAgo) {
      return NextResponse.json({
        recentLink: {
          provider: recentAccount.provider,
          createdAt: accountCreatedAt,
        },
      })
    }

    return NextResponse.json({ recentLink: null })
  } catch (error) {
    console.error('[Recent Link] Error:', error)
    return NextResponse.json({ recentLink: null })
  }
}

