import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/client'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    await prisma.pendingAccountLink.deleteMany({
      where: { token },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Reject Link] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

