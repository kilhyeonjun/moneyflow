import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// 사용자 프로필 업데이트를 위한 PUT 엔드포인트
export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { type, data } = body

    if (type === 'profile') {
      // 프로필 업데이트
      const { full_name, avatar_url } = data

      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            full_name,
            avatar_url,
          }
        }
      )

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (type === 'organization') {
      // 조직 정보 업데이트
      const { organizationId, name, description } = data

      // 사용자가 해당 조직의 owner 또는 admin인지 확인
      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      })

      if (!member || !['owner', 'admin'].includes(member.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // 조직 정보 업데이트
      await prisma.organization.update({
        where: { id: organizationId },
        data: { name, description },
      })

      return NextResponse.json({ success: true })
    }

    if (type === 'settings') {
      // 사용자 설정 업데이트 (향후 구현)
      // 현재는 로컬 스토리지에 저장하도록 처리
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })

  } catch (error) {
    console.error('설정 업데이트 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // URL에서 organization_id 가져오기
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // 사용자가 해당 조직의 멤버인지 확인
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 조직 정보 조회 - Prisma 사용
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // 조직 멤버 조회 - Prisma 사용
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: {
        id: true,
        userId: true,
        role: true,
        joinedAt: true,
      },
      orderBy: { joinedAt: 'desc' },
    })

    // 응답 형식을 기존 Supabase 형식과 맞추기
    const formattedOrganization = {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      created_by: organization.createdBy,
      created_at: organization.createdAt,
      updated_at: organization.updatedAt,
    }

    const formattedMembers = members.map((member) => ({
      id: member.id,
      organization_id: organizationId,
      user_id: member.userId,
      role: member.role,
      joined_at: member.joinedAt,
    }))

    return NextResponse.json({
      organization: formattedOrganization,
      members: formattedMembers,
    })
  } catch (error) {
    console.error('설정 페이지 데이터 로드 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}