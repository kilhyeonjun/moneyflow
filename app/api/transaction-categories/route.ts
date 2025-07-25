import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'
import { Prisma } from '@prisma/client'

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
