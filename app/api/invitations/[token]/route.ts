import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// 초대 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // 초대 정보 조회 - Prisma 사용
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // 만료 확인
    if (new Date(invitation.expiresAt) < new Date()) {
      // 만료된 초대 상태 업데이트 - Prisma 사용
      await prisma.organizationInvitation.update({
        where: { token },
        data: { status: 'expired' },
      })

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // 이미 처리된 초대 확인
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Invitation has already been ${invitation.status}`,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    })
  } catch (error) {
    console.error('초대 정보 조회 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 초대 수락
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { action } = await request.json() // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Supabase Auth는 그대로 사용 (auth 관련은 유지)
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 인증 확인 - Supabase Auth 유지
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 초대 정보 조회 - Prisma 사용
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // 이메일 확인
    if (invitation.email !== user.email) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
    }

    // 만료 확인
    if (new Date(invitation.expiresAt) < new Date()) {
      await prisma.organizationInvitation.update({
        where: { token },
        data: { status: 'expired' },
      })

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // 이미 처리된 초대 확인
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Invitation has already been ${invitation.status}`,
        },
        { status: 409 }
      )
    }

    if (action === 'accept') {
      // 이미 멤버인지 확인 - Prisma 사용
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
      })

      if (existingMember) {
        // 초대 상태 업데이트 - Prisma 사용
        await prisma.organizationInvitation.update({
          where: { token },
          data: {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: user.id,
          },
        })

        return NextResponse.json({
          message: 'You are already a member of this organization',
        })
      }

      // 트랜잭션으로 멤버 추가 및 초대 상태 업데이트 - Prisma 사용
      try {
        await prisma.$transaction(async (tx) => {
          // 멤버 추가
          await tx.organizationMember.create({
            data: {
              organizationId: invitation.organizationId,
              userId: user.id,
              role: invitation.role,
            },
          })

          // 초대 상태 업데이트
          await tx.organizationInvitation.update({
            where: { token },
            data: {
              status: 'accepted',
              acceptedAt: new Date(),
              acceptedBy: user.id,
            },
          })
        })

        return NextResponse.json({
          message: 'Invitation accepted successfully',
          organizationId: invitation.organizationId,
        })
      } catch (memberError) {
        console.error('멤버 추가 실패:', memberError)
        return NextResponse.json(
          { error: 'Failed to add member' },
          { status: 500 }
        )
      }
    } else {
      // 초대 거절 - Prisma 사용
      try {
        await prisma.organizationInvitation.update({
          where: { token },
          data: { status: 'rejected' },
        })

        return NextResponse.json({ message: 'Invitation rejected' })
      } catch (updateError) {
        console.error('초대 거절 실패:', updateError)
        return NextResponse.json(
          { error: 'Failed to reject invitation' },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('초대 처리 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}