import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// 목표 목록 조회
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

    // 목표 목록 조회 - Prisma 사용
    const goals = await prisma.financialGoal.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    // 응답 형식을 기존 Supabase 형식과 맞추기
    const formattedGoals = goals.map((goal) => ({
      id: goal.id,
      organization_id: goal.organizationId,
      title: goal.name, // 매핑: name -> title
      type: goal.category, // 매핑: category -> type
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate,
      priority: goal.priority,
      status: goal.status,
      created_at: goal.createdAt,
      updated_at: goal.updatedAt,
    }))

    return NextResponse.json({ goals: formattedGoals })
  } catch (error) {
    console.error('목표 로드 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 새 목표 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, type, target_amount, target_date, organization_id } = body

    if (!title || !target_amount || !organization_id) {
      return NextResponse.json(
        { error: 'Title, target amount, and organization ID are required' },
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

    // 사용자 정보 가져오기 - Supabase Auth 유지
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 사용자가 해당 조직의 멤버인지 확인
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization_id,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 새 목표 생성 - Prisma 사용
    const goal = await prisma.financialGoal.create({
      data: {
        organizationId: organization_id,
        name: title, // 매핑: title -> name
        targetAmount: parseFloat(target_amount),
        targetDate: target_date ? new Date(target_date) : null,
        category: type, // 매핑: type -> category
        priority: 'medium', // 기본값
      },
    })

    // 응답 형식을 기존 Supabase 형식과 맞추기
    const formattedGoal = {
      id: goal.id,
      organization_id: goal.organizationId,
      title: goal.name, // 매핑: name -> title
      type: goal.category, // 매핑: category -> type
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate,
      priority: goal.priority,
      status: goal.status,
      created_at: goal.createdAt,
      updated_at: goal.updatedAt,
    }

    return NextResponse.json({ goal: formattedGoal })
  } catch (error) {
    console.error('목표 생성 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}