import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// 초대 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params

    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 정보 가져오기 - Supabase Auth 유지
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 조직 멤버 권한 확인 - Prisma 사용
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      select: { role: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 초대 목록 조회 - Prisma 사용
    const invitations = await prisma.organizationInvitation.findMany({
      where: { organizationId },
      include: {
        organization: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ 
      invitations: invitations.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        created_at: invitation.createdAt,
        expires_at: invitation.expiresAt,
        invited_by: null, // This field wasn't in our schema, keeping for compatibility
        organizations: { name: invitation.organization.name },
      }))
    })
  } catch (error) {
    console.error('초대 목록 조회 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 새 초대 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const { email, role = 'member' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 이메일 형식 검증 (개발 환경에서는 .test 도메인 허용)
    const emailRegex = process.env.NODE_ENV === 'development' 
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      : /^[^\s@]+@[^\s@]+\.(?!test$)[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 인증 및 권한 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 정보 가져오기 - Supabase Auth 유지
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 조직 존재 확인 - Prisma 사용
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // 이미 멤버인지 확인 - Prisma 사용
    const existingMember = await prisma.organizationMember.findUnique({
      where: { 
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 409 }
      )
    }

    // 기존 대기 중인 초대 확인 - Prisma 사용
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email,
        status: 'pending',
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent' },
        { status: 409 }
      )
    }

    // 만료된 초대 정리 - Prisma 사용 (RPC 대신 직접 처리)
    await prisma.organizationInvitation.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'pending',
      },
      data: { status: 'expired' },
    })

    // 새 초대 생성 - Prisma 사용
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // Generate random token
    const token = randomBytes(32).toString('hex')

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        role,
        token,
        expiresAt,
      },
    })

    // 이메일 발송 (실제 구현에서는 이메일 서비스 사용)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`

    // TODO: 실제 이메일 발송 로직 구현
    console.log(`초대 이메일 발송: ${email}`)
    console.log(`초대 링크: ${inviteUrl}`)

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        inviteUrl,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    console.error('초대 생성 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 초대 취소/삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('invitationId')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // 초대 삭제 (상태를 'cancelled'로 변경) - Prisma 사용
    await prisma.organizationInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId,
        status: 'pending',
      },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ message: 'Invitation cancelled successfully' })
  } catch (error) {
    console.error('초대 취소 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}