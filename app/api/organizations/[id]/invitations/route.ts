import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// 초대 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('=== 초대 목록 조회 API 시작 ===')
  try {
    const { id: organizationId } = await params
    console.log('Organization ID:', organizationId)

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
  console.log('=== 초대 생성 API 시작 ===')
  try {
    const { id: organizationId } = await params
    console.log('Organization ID:', organizationId)
    
    const { email: rawEmail, role = 'member' } = await request.json()
    // 이메일 정규화: 소문자 변환 및 공백 제거
    const email = rawEmail?.trim().toLowerCase()
    console.log('Request data:', { email, role, rawEmail })

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

    // 초대를 보내는 사용자가 해당 조직의 멤버인지 확인 - Prisma 사용
    const senderMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      select: { role: true },
    })

    if (!senderMember || !['owner', 'admin'].includes(senderMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to send invitations' },
        { status: 403 }
      )
    }

    // 해당 이메일로 이미 가입된 사용자가 조직 멤버인지 확인
    // getUserByEmail을 사용하되 에러 처리를 개선
    let isAlreadyMember = false
    try {
      const { data: inviteeUser, error: userError } = await supabaseClient.auth.admin.getUserByEmail(email)
      
      if (!userError && inviteeUser?.user) {
        const existingMember = await prisma.organizationMember.findUnique({
          where: { 
            organizationId_userId: {
              organizationId,
              userId: inviteeUser.user.id,
            },
          },
        })

        if (existingMember) {
          isAlreadyMember = true
        }
      }
    } catch (userCheckError) {
      // 사용자 조회 실패 시 로그만 남기고 계속 진행 (새 사용자일 가능성)
      console.log('사용자 조회 중 에러 (새 사용자일 수 있음):', userCheckError)
    }

    if (isAlreadyMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 }
      )
    }

    // 기존 대기 중인 초대 확인 - Prisma 사용 (정규화된 이메일로 검색)
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email, // 이미 정규화된 이메일
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

    // TODO: 이메일 발송 기능 구현
    // 현재는 대시보드에서 직접 초대를 확인할 수 있으므로 이메일 발송은 선택사항
    // 향후 구현 옵션:
    // 1. Resend (무료 3,000통/월) - 추천
    // 2. Supabase Auth 기본 이메일 (무료, 제한적 커스터마이징)
    // 3. SendGrid (무료 100통/월)
    // 4. NodeMailer + Gmail SMTP (무료, 500통/일)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`

    console.log(`[TODO] 초대 이메일 발송: ${email}`)
    console.log(`[TODO] 초대 링크: ${inviteUrl}`)
    console.log(`[INFO] 사용자는 대시보드에서 초대를 확인할 수 있습니다.`)

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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      organizationId,
      email,
      role,
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