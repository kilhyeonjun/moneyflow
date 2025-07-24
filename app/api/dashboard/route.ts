import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

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

    // 모든 거래 내역 로드 - Prisma 사용
    const transactions = await prisma.transaction.findMany({
      where: { organizationId },
      include: {
        category: {
          select: {
            name: true,
            transactionType: true,
          },
        },
        paymentMethod: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    })

    // 응답 형식을 기존 Supabase 형식과 맞추기
    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      organization_id: transaction.organizationId,
      user_id: transaction.userId,
      amount: transaction.amount,
      description: transaction.description,
      transaction_date: transaction.transactionDate,
      transaction_type: transaction.transactionType,
      category_id: transaction.categoryId,
      payment_method_id: transaction.paymentMethodId,
      tags: transaction.tags,
      memo: transaction.memo,
      receipt_url: transaction.receiptUrl,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
      categories: transaction.category
        ? {
            name: transaction.category.name,
            transaction_type: transaction.category.transactionType,
          }
        : null,
      payment_methods: transaction.paymentMethod
        ? {
            name: transaction.paymentMethod.name,
          }
        : null,
    }))

    return NextResponse.json({ transactions: formattedTransactions })
  } catch (error) {
    console.error('대시보드 데이터 로드 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}