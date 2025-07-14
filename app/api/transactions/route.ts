import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const categoryId = searchParams.get('categoryId')
    const transactionType = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // 필터 조건 구성
    const where: any = {
      organization_id: organizationId,
    }

    if (categoryId) {
      where.category_id = categoryId
    }

    if (transactionType) {
      where.transaction_type = transactionType
    }

    if (startDate || endDate) {
      where.transaction_date = {}
      if (startDate) {
        where.transaction_date.gte = new Date(startDate)
      }
      if (endDate) {
        where.transaction_date.lte = new Date(endDate)
      }
    }

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        categories: true,
      },
      orderBy: {
        transaction_date: 'desc',
      },
      ...(limit && { take: parseInt(limit) }),
      ...(offset && { skip: parseInt(offset) }),
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Transactions fetch error:', error)
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
      userId
    } = body

    if (!categoryId || !amount || !transactionType || !organizationId || !userId) {
      return NextResponse.json(
        { error: 'CategoryId, amount, transactionType, organizationId, and userId are required' },
        { status: 400 }
      )
    }

    // 거래 타입 검증
    if (!['income', 'expense', 'transfer'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be income, expense, or transfer' },
        { status: 400 }
      )
    }

    const transaction = await prisma.transactions.create({
      data: {
        category_id: categoryId,
        amount: parseFloat(amount),
        description,
        transaction_date: transactionDate ? new Date(transactionDate) : new Date(),
        transaction_type: transactionType,
        organization_id: organizationId,
        user_id: userId,
      },
      include: {
        categories: true,
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
      organizationId 
    } = body

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Transaction ID and organizationId are required' },
        { status: 400 }
      )
    }

    // 권한 확인: 해당 조직의 거래인지 검증
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        id: id,
        organization_id: organizationId,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      )
    }

    // 거래 타입 검증 (제공된 경우)
    if (transactionType && !['income', 'expense', 'transfer'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be income, expense, or transfer' },
        { status: 400 }
      )
    }

    const updatedTransaction = await prisma.transactions.update({
      where: { id: id },
      data: {
        ...(categoryId && { category_id: categoryId }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(transactionDate && { transaction_date: new Date(transactionDate) }),
        ...(transactionType && { transaction_type: transactionType }),
      },
      include: {
        categories: true,
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
    const organizationId = searchParams.get('organizationId')

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Transaction ID and organizationId are required' },
        { status: 400 }
      )
    }

    // 권한 확인: 해당 조직의 거래인지 검증
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        id: id,
        organization_id: organizationId,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.transactions.delete({
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
