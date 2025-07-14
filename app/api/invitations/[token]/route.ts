import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 초대 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 초대 정보 조회
    const { data: invitation, error } = await supabaseClient
      .from('organization_invitations')
      .select(
        `
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        organizations!inner(
          id,
          name,
          description
        )
      `
      )
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // 만료 확인
    if (new Date(invitation.expires_at) < new Date()) {
      // 만료된 초대 상태 업데이트
      await supabaseClient
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('token', token)

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
        organization: invitation.organizations,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
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
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token
    const { action } = await request.json() // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 인증 확인
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

    // 초대 정보 조회
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
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
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseClient
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('token', token)

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
      // 이미 멤버인지 확인
      const { data: existingMember } = await supabaseClient
        .from('organization_members')
        .select('id')
        .eq('organization_id', invitation.organization_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        // 초대 상태 업데이트
        await supabaseClient
          .from('organization_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: user.id,
          })
          .eq('token', token)

        return NextResponse.json({
          message: 'You are already a member of this organization',
        })
      }

      // 트랜잭션으로 멤버 추가 및 초대 상태 업데이트
      const { error: memberError } = await supabaseClient
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
        })

      if (memberError) {
        console.error('멤버 추가 실패:', memberError)
        return NextResponse.json(
          { error: 'Failed to add member' },
          { status: 500 }
        )
      }

      // 초대 상태 업데이트
      const { error: updateError } = await supabaseClient
        .from('organization_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('token', token)

      if (updateError) {
        console.error('초대 상태 업데이트 실패:', updateError)
        // 멤버는 이미 추가되었으므로 에러를 로그만 남김
      }

      return NextResponse.json({
        message: 'Invitation accepted successfully',
        organizationId: invitation.organization_id,
      })
    } else {
      // 초대 거절
      const { error: updateError } = await supabaseClient
        .from('organization_invitations')
        .update({ status: 'rejected' })
        .eq('token', token)

      if (updateError) {
        console.error('초대 거절 실패:', updateError)
        return NextResponse.json(
          { error: 'Failed to reject invitation' },
          { status: 500 }
        )
      }

      return NextResponse.json({ message: 'Invitation rejected' })
    }
  } catch (error) {
    console.error('초대 처리 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
