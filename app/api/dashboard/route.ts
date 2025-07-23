import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'
import { Prisma, Transaction, Category } from '@prisma/client'

type ExpensesByCategoryResult = {
  categoryId: string | null
  _sum: {
    amount: Prisma.Decimal | null
  }
}

type TransactionWithCategory = Transaction & {
  category: Category | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

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

    // 현재 월의 시작과 끝
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // 이전 월의 시작과 끝
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // 병렬로 모든 데이터 조회 (간소화된 버전)
    const [
      // 자산 총액
      totalAssets,
      // 부채 총액
      totalLiabilities,
      // 이번 달 수입
      currentMonthIncome,
      // 이번 달 지출
      currentMonthExpenses,
      // 지난 달 수입
      lastMonthIncome,
      // 지난 달 지출
      lastMonthExpenses,
      // 최근 거래 내역
      recentTransactions,
      // 카테고리별 지출 (이번 달)
      expensesByCategory,
    ] = await Promise.all([
      // 자산 총액
      prisma.asset.aggregate({
        where: { organizationId: organizationId },
        _sum: { currentValue: true },
      }),

      // 부채 총액
      prisma.liability.aggregate({
        where: { organizationId: organizationId },
        _sum: { currentAmount: true },
      }),

      // 이번 달 수입
      prisma.transaction.aggregate({
        where: {
          organizationId: organizationId,
          transactionType: 'income',
          transactionDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        _sum: { amount: true },
      }),

      // 이번 달 지출
      prisma.transaction.aggregate({
        where: {
          organizationId: organizationId,
          transactionType: 'expense',
          transactionDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        _sum: { amount: true },
      }),

      // 지난 달 수입
      prisma.transaction.aggregate({
        where: {
          organizationId: organizationId,
          transactionType: 'income',
          transactionDate: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
        _sum: { amount: true },
      }),

      // 지난 달 지출
      prisma.transaction.aggregate({
        where: {
          organizationId: organizationId,
          transactionType: 'expense',
          transactionDate: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
        _sum: { amount: true },
      }),

      // 최근 거래 내역 (최근 10건)
      prisma.transaction.findMany({
        where: { organizationId: organizationId },
        include: { category: true },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),

      // 카테고리별 지출 (이번 달)
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          organizationId: organizationId,
          transactionType: 'expense',
          transactionDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ])

    // 카테고리 정보 조회 (카테고리별 지출에 사용)
    const categoryIds = expensesByCategory
      .map((item: ExpensesByCategoryResult) => item.categoryId)
      .filter((id): id is string => id !== null)
    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
          })
        : []

    // 카테고리 정보와 지출 데이터 결합
    const expensesWithCategories = expensesByCategory.map((expense: ExpensesByCategoryResult) => {
      const category = categories.find(cat => cat.id === expense.categoryId)
      return {
        categoryId: expense.categoryId,
        categoryName: category?.name || '미분류',
        amount: Number(expense._sum.amount || 0),
        icon: category?.icon,
        color: category?.color,
      }
    })

    // 증감률 계산
    const incomeChange = calculatePercentageChange(
      Number(lastMonthIncome._sum.amount || 0),
      Number(currentMonthIncome._sum.amount || 0)
    )

    const expenseChange = calculatePercentageChange(
      Number(lastMonthExpenses._sum.amount || 0),
      Number(currentMonthExpenses._sum.amount || 0)
    )

    // 순자산 계산
    const netWorth =
      Number(totalAssets._sum.currentValue || 0) -
      Number(totalLiabilities._sum.currentAmount || 0)

    // 이번 달 순수익 계산
    const currentMonthNetIncome =
      Number(currentMonthIncome._sum.amount || 0) -
      Number(currentMonthExpenses._sum.amount || 0)

    const dashboardData = {
      // 재정 현황
      financial: {
        totalAssets: Number(totalAssets._sum.currentValue || 0),
        totalLiabilities: Number(totalLiabilities._sum.currentAmount || 0),
        netWorth,
        currentMonthIncome: Number(currentMonthIncome._sum.amount || 0),
        currentMonthExpenses: Number(currentMonthExpenses._sum.amount || 0),
        currentMonthNetIncome,
        incomeChange,
        expenseChange,
      },

      // 최근 거래
      recentTransactions: recentTransactions.map((transaction: TransactionWithCategory) => ({
        id: transaction.id,
        amount: Number(transaction.amount),
        description: transaction.description,
        date: transaction.transactionDate,
        type: transaction.transactionType,
        categoryName: transaction.category?.name || '미분류',
      })),

      // 카테고리별 지출
      expensesByCategory: expensesWithCategories,

      // 메타 정보
      meta: {
        currentMonth: currentMonthStart.toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error(
      'Dashboard data fetch error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

// 증감률 계산 함수
function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue > 0 ? 100 : 0
  }
  return Math.round(((newValue - oldValue) / oldValue) * 100)
}
