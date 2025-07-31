import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'
import { Prisma } from '@prisma/client'
import { createInitialData } from '@/lib/initial-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const type = searchParams.get('type') // income, expense, transfer

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    const where: Prisma.CategoryWhereInput = {
      organizationId: organizationId,
    }

    if (type) {
      where.transactionType = type
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    })

    // 카테고리가 없으면 기본 카테고리를 자동으로 생성
    if (!categories || categories.length === 0) {
      console.log(`조직 ${organizationId}에 거래 카테고리가 없어서 초기 데이터를 생성합니다.`)
      
      try {
        await createInitialData(organizationId)
        
        // 다시 카테고리 조회
        const newCategories = await prisma.category.findMany({
          where,
          orderBy: {
            name: 'asc',
          },
        })
        
        return NextResponse.json(newCategories)
      } catch (initError) {
        console.error('초기 데이터 생성 실패:', initError)
        // 초기 데이터 생성에 실패해도 빈 배열 반환
        return NextResponse.json([])
      }
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error(
      'Transaction categories fetch error:',
      error || 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to fetch transaction categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, icon, color, organizationId } = body

    if (!name || !type || !organizationId) {
      return NextResponse.json(
        { error: 'Name, type, and organizationId are required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 타입 검증
    if (!['income', 'expense', 'transfer'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be income, expense, or transfer' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        transactionType: type,
        icon,
        color,
        organizationId: organizationId,
        level: 1, // 기본 레벨
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error(
      'Transaction category creation error:',
      error || 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to create transaction category' },
      { status: 500 }
    )
  }
}
