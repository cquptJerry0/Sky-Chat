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

    const pendingLink = await prisma.pendingAccountLink.findUnique({
      where: { token },
    })

    if (!pendingLink) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    if (pendingLink.expires < new Date()) {
      await prisma.pendingAccountLink.delete({
        where: { token },
      })
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 410 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: pendingLink.email },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    await prisma.account.create({
      data: {
        userId: existingUser.id,
        type: 'oauth',
        provider: pendingLink.provider,
        providerAccountId: pendingLink.providerAccountId,
      },
    })

    if (!existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: new Date() },
      })
    }

    await prisma.pendingAccountLink.delete({
      where: { token },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Confirm Link] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

