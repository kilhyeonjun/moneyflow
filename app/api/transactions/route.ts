import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const categoryId = searchParams.get('category_id')
    const transactionType = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    // Validate categoryId if provided
    if (categoryId && !isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 필터 조건 구성
    const where: any = {
      organizationId: organizationId,
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (transactionType) {
      where.transactionType = transactionType
    }

    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) {
        where.transactionDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
      ...(limit && { take: parseInt(limit) }),
      ...(offset && { skip: parseInt(offset) }),
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Transactions fetch error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      categoryId,
      amount,
      description,
      transactionDate,
      transactionType,
      organizationId,
      userId,
    } = body

    if (
      !categoryId ||
      !amount ||
      !transactionType ||
      !organizationId ||
      !userId
    ) {
      return NextResponse.json(
        {
          error:
            'categoryId, amount, transactionType, organizationId, and userId are required',
        },
        { status: 400 }
      )
    }

    // 거래 타입 검증
    if (!['income', 'expense', 'transfer'].includes(transactionType)) {
      return NextResponse.json(
        {
          error:
            'Invalid transaction type. Must be income, expense, or transfer',
        },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.create({
      data: {
        categoryId: categoryId,
        amount: parseFloat(amount),
        description,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        transactionType: transactionType,
        organizationId: organizationId,
        userId: userId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Transaction creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      categoryId,
      amount,
      description,
      transactionDate,
      transactionType,
      organizationId,
    } = body

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Transaction ID and organizationId are required' },
        { status: 400 }
      )
    }

    // 권한 확인: 해당 조직의 거래인지 검증
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      )
    }

    // 거래 타입 검증 (제공된 경우)
    if (
      transactionType &&
      !['income', 'expense', 'transfer'].includes(transactionType)
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid transaction type. Must be income, expense, or transfer',
        },
        { status: 400 }
      )
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: id },
      data: {
        ...(categoryId && { categoryId: categoryId }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(transactionDate && {
          transactionDate: new Date(transactionDate),
        }),
        ...(transactionType && { transactionType: transactionType }),
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Transaction update error:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction', details: error },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const organizationId = searchParams.get('organization_id')

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Transaction ID and organizationId are required' },
        { status: 400 }
      )
    }

    // 권한 확인: 해당 조직의 거래인지 검증
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.transaction.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('Transaction deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction', details: error },
      { status: 500 }
    )
  }
}
