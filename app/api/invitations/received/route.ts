import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// 현재 사용자가 받은 초대 목록 조회
export async function GET(request: NextRequest) {
  console.log('=== 받은 초대 조회 API 시작 ===')
  try {
    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('Authorization 헤더가 없습니다')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 정보 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 현재 사용자의 이메일로 받은 대기 중인 초대 조회 (이메일 정규화)
    const normalizedEmail = user.email?.trim().toLowerCase()
    console.log('User email (normalized):', normalizedEmail, 'Original:', user.email)
    
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        email: normalizedEmail,
        status: 'pending',
        expiresAt: { gt: new Date() }, // 만료되지 않은 초대만
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    console.log(`발견된 초대 수: ${invitations.length}`)
    console.log('초대 목록:', invitations.map(inv => ({ id: inv.id, email: inv.email, status: inv.status, org: inv.organization.name })))

    // 이미 가입한 조직은 제외
    const filteredInvitations = []
    for (const invitation of invitations) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
      })

      if (!existingMember) {
        filteredInvitations.push(invitation)
      }
    }

    const result = {
      invitations: filteredInvitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        organization: invitation.organization,
        token: invitation.token, // 승인/거절 처리용
      })),
    }
    
    console.log(`최종 반환될 초대 수: ${result.invitations.length}`)
    console.log('최종 반환 데이터:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('받은 초대 목록 조회 에러:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    )
  }
}

// 초대 승인/거절 처리
export async function POST(request: NextRequest) {
  try {
    const { invitationId, action } = await request.json()

    if (!invitationId || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 정보 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 초대 정보 조회 및 권한 확인
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // 본인 이메일로 온 초대인지 확인 (이메일 정규화)
    const normalizedUserEmail = user.email?.trim().toLowerCase()
    const normalizedInvitationEmail = invitation.email?.trim().toLowerCase()
    console.log('Email comparison:', { normalizedUserEmail, normalizedInvitationEmail })
    
    if (normalizedInvitationEmail !== normalizedUserEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 이미 처리된 초대인지 확인
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation already processed' },
        { status: 409 }
      )
    }

    // 만료된 초대인지 확인
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    if (action === 'accept') {
      // 이미 조직 멤버인지 확인
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'Already a member of this organization' },
          { status: 409 }
        )
      }

      // 트랜잭션으로 멤버 추가 및 초대 승인 처리
      await prisma.$transaction([
        // 조직 멤버로 추가
        prisma.organizationMember.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
            joinedAt: new Date(),
          },
        }),
        // 초대 상태 업데이트
        prisma.organizationInvitation.update({
          where: { id: invitationId },
          data: {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: user.id,
          },
        }),
      ])

      return NextResponse.json({
        message: 'Invitation accepted successfully',
        organization: invitation.organization,
      })
    } else {
      // 초대 거절
      await prisma.organizationInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'rejected',
          acceptedAt: new Date(), // 처리 시간 기록
          acceptedBy: user.id,
        },
      })

      return NextResponse.json({
        message: 'Invitation rejected successfully',
      })
    }
  } catch (error) {
    console.error('초대 처리 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}