import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 초대 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id

    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 조직 멤버 권한 확인
    const { data: member, error: memberError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 초대 목록 조회
    const { data: invitations, error } = await supabaseClient
      .from('organization_invitations')
      .select(
        `
        id,
        email,
        role,
        status,
        created_at,
        expires_at,
        invited_by,
        organizations!inner(name)
      `
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('초대 목록 조회 실패:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invitations })
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
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id
    const { email, role = 'member' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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

    // 조직 존재 확인
    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabaseClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', (await supabaseClient.auth.getUser()).data.user?.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 409 }
      )
    }

    // 기존 대기 중인 초대 확인
    const { data: existingInvitation } = await supabaseClient
      .from('organization_invitations')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent' },
        { status: 409 }
      )
    }

    // 만료된 초대 정리
    await supabaseClient.rpc('cleanup_expired_invitations')

    // 새 초대 생성
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    const { data: invitation, error: inviteError } = await supabaseClient
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        expires_at: expiresAt.toISOString(),
        invited_by: (await supabaseClient.auth.getUser()).data.user?.id,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('초대 생성 실패:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

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
        expiresAt: invitation.expires_at,
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
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('invitationId')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 초대 삭제 (상태를 'cancelled'로 변경)
    const { error } = await supabaseClient
      .from('organization_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')

    if (error) {
      console.error('초대 취소 실패:', error)
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Invitation cancelled successfully' })
  } catch (error) {
    console.error('초대 취소 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
