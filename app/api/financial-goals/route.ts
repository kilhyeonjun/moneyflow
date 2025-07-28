import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

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

    // UUID 형식 검증
    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
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
    const formattedGoals = await Promise.all(goals.map(async (goal) => {
      // 달성률 계산
      const achievementRate = goal.targetAmount > 0 
        ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 
        : 0

      // 목표 달성시 상태 자동 업데이트
      let updatedGoal = goal
      if (achievementRate >= 100 && goal.status === 'active') {
        updatedGoal = await prisma.financialGoal.update({
          where: { id: goal.id },
          data: { 
            status: 'completed',
            updatedAt: new Date()
          },
        })
      }

      return {
        id: updatedGoal.id,
        organization_id: updatedGoal.organizationId,
        title: updatedGoal.name, // 매핑: name -> title
        type: updatedGoal.category, // 매핑: category -> type
        target_amount: updatedGoal.targetAmount,
        current_amount: updatedGoal.currentAmount,
        target_date: updatedGoal.targetDate,
        priority: updatedGoal.priority,
        status: updatedGoal.status,
        achievement_rate: achievementRate,
        created_at: updatedGoal.createdAt,
        updated_at: updatedGoal.updatedAt,
      }
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
        createdBy: user.id,
      },
    })

    // 달성률 계산 및 상태 자동 업데이트
    const achievementRate = goal.targetAmount > 0 
      ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 
      : 0

    // 목표 달성시 상태 자동 업데이트
    let updatedGoal = goal
    if (achievementRate >= 100 && goal.status === 'active') {
      updatedGoal = await prisma.financialGoal.update({
        where: { id: goal.id },
        data: { 
          status: 'completed',
          updatedAt: new Date()
        },
      })
    }

    const formattedGoal = {
      id: updatedGoal.id,
      organization_id: updatedGoal.organizationId,
      title: updatedGoal.name, // 매핑: name -> title
      type: updatedGoal.category, // 매핑: category -> type
      target_amount: updatedGoal.targetAmount,
      current_amount: updatedGoal.currentAmount,
      target_date: updatedGoal.targetDate,
      priority: updatedGoal.priority,
      status: updatedGoal.status,
      achievement_rate: achievementRate,
      created_at: updatedGoal.createdAt,
      updated_at: updatedGoal.updatedAt,
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

// 목표 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, type, target_amount, target_date, current_amount } = body

    if (!id || !title || !target_amount) {
      return NextResponse.json(
        { error: 'ID, title, and target amount are required' },
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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 기존 목표 확인 및 조직 멤버십 검증
    const existingGoal = await prisma.financialGoal.findUnique({
      where: { id },
      include: { organization: true },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // 사용자가 해당 조직의 멤버인지 확인
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: existingGoal.organizationId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 목표 수정
    const updatedGoal = await prisma.financialGoal.update({
      where: { id },
      data: {
        name: title,
        category: type,
        targetAmount: parseFloat(target_amount),
        targetDate: target_date ? new Date(target_date) : null,
        currentAmount: current_amount ? parseFloat(current_amount) : existingGoal.currentAmount,
        updatedAt: new Date(),
      },
    })

    // 달성률 계산 및 상태 자동 업데이트
    const achievementRate = updatedGoal.targetAmount > 0 
      ? (Number(updatedGoal.currentAmount) / Number(updatedGoal.targetAmount)) * 100 
      : 0

    // 목표 달성시 상태 자동 업데이트
    let finalGoal = updatedGoal
    if (achievementRate >= 100 && updatedGoal.status === 'active') {
      finalGoal = await prisma.financialGoal.update({
        where: { id: updatedGoal.id },
        data: { 
          status: 'completed',
          updatedAt: new Date()
        },
      })
    }

    const formattedGoal = {
      id: finalGoal.id,
      organization_id: finalGoal.organizationId,
      title: finalGoal.name,
      type: finalGoal.category,
      target_amount: finalGoal.targetAmount,
      current_amount: finalGoal.currentAmount,
      target_date: finalGoal.targetDate,
      priority: finalGoal.priority,
      status: finalGoal.status,
      achievement_rate: achievementRate,
      created_at: finalGoal.createdAt,
      updated_at: finalGoal.updatedAt,
    }

    return NextResponse.json({ goal: formattedGoal })
  } catch (error) {
    console.error('목표 수정 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 목표 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 기존 목표 확인 및 조직 멤버십 검증
    const existingGoal = await prisma.financialGoal.findUnique({
      where: { id },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // 사용자가 해당 조직의 멤버인지 확인
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: existingGoal.organizationId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 목표 삭제
    await prisma.financialGoal.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Goal deleted successfully' })
  } catch (error) {
    console.error('목표 삭제 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}