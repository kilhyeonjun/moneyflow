import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// 목표 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    const body = await request.json()
    const { title, type, target_amount, target_date } = body

    if (!title || !target_amount) {
      return NextResponse.json(
        { error: 'Title and target amount are required' },
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

    // 목표 존재 확인 및 권한 검증
    const existingGoal = await prisma.financialGoal.findUnique({
      where: { id: goalId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    })

    if (!existingGoal || existingGoal.organization.members.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found or access denied' },
        { status: 404 }
      )
    }

    // 목표 수정 - Prisma 사용
    const updatedGoal = await prisma.financialGoal.update({
      where: { id: goalId },
      data: {
        name: title, // 매핑: title -> name
        targetAmount: parseFloat(target_amount),
        targetDate: target_date ? new Date(target_date) : null,
        category: type, // 매핑: type -> category
      },
    })

    // 응답 형식을 기존 Supabase 형식과 맞추기
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
      created_at: updatedGoal.createdAt,
      updated_at: updatedGoal.updatedAt,
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params

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

    // 목표 존재 확인 및 권한 검증
    const existingGoal = await prisma.financialGoal.findUnique({
      where: { id: goalId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    })

    if (!existingGoal || existingGoal.organization.members.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found or access denied' },
        { status: 404 }
      )
    }

    // 목표 삭제 - Prisma 사용
    await prisma.financialGoal.delete({
      where: { id: goalId },
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