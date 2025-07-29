import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

// 분석 데이터 조회
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

    // 사용자 정보 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // URL에서 파라미터 가져오기
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const period = searchParams.get('period') || 'monthly' // monthly, yearly
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const month = searchParams.get('month')

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

    let analyticsData = {}

    if (period === 'monthly') {
      analyticsData = await getMonthlyAnalytics(organizationId, parseInt(year), month ? parseInt(month) : undefined)
    } else if (period === 'yearly') {
      analyticsData = await getYearlyAnalytics(organizationId, parseInt(year))
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('분석 데이터 로드 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 월별 분석 데이터 계산
async function getMonthlyAnalytics(organizationId: string, year: number, targetMonth?: number) {
  try {
    // 1. 월별 수입/지출/저축 데이터 계산
    const monthlyData = []
    
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0) // 해당 월의 마지막 날
      
      // 해당 월의 거래 데이터 조회
      const transactions = await prisma.transaction.findMany({
        where: {
          organizationId,
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
      })

      // 수입과 지출 계산
      const income = transactions
        .filter(t => t.transactionType === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)
      
      const expense = transactions
        .filter(t => t.transactionType === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const savings = income - expense

      // 해당 월 말 순자산 계산 (자산 - 부채)
      const assets = await prisma.asset.findMany({
        where: {
          organizationId,
        },
      })
      
      const debts = await prisma.debt.findMany({
        where: {
          organizationId,
        },
      })

      const totalAssets = assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0)
      const totalDebts = debts.reduce((sum, debt) => sum + Number(debt.remainingAmount), 0)
      const netWorth = totalAssets - totalDebts

      monthlyData.push({
        month: `${month}월`,
        monthNumber: month,
        income,
        expense,
        savings,
        netWorth,
        transactionCount: transactions.length,
      })
    }

    // 2. 카테고리별 지출 분석 (지정된 월 또는 전체 년도)
    const categoryFilter = targetMonth
      ? {
          organizationId,
          transactionType: 'expense',
          transactionDate: {
            gte: new Date(year, targetMonth - 1, 1),
            lte: new Date(year, targetMonth, 0),
          },
        }
      : {
          organizationId,
          transactionType: 'expense',
          transactionDate: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31),
          },
        }

    const expenseTransactions = await prisma.transaction.findMany({
      where: categoryFilter,
      include: {
        category: true,
      },
    })

    const categoryAnalysis = new Map<string, { amount: number; count: number; categoryId: string }>()
    let totalExpense = 0

    expenseTransactions.forEach(transaction => {
      const categoryName = transaction.category?.name || '미분류'
      const amount = Number(transaction.amount)
      totalExpense += amount

      if (categoryAnalysis.has(categoryName)) {
        const existing = categoryAnalysis.get(categoryName)!
        existing.amount += amount
        existing.count += 1
      } else {
        categoryAnalysis.set(categoryName, {
          amount,
          count: 1,
          categoryId: transaction.categoryId || 'unknown',
        })
      }
    })

    const categoryData = Array.from(categoryAnalysis.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalExpense > 0 ? Number(((data.amount / totalExpense) * 100).toFixed(1)) : 0,
        color: getCategoryColor(name),
      }))
      .sort((a, b) => b.amount - a.amount)

    // 3. 현재 월 요약 데이터
    const currentMonth = targetMonth || new Date().getMonth() + 1
    const currentMonthData = monthlyData[currentMonth - 1]

    return {
      monthlyData,
      categoryAnalysis: categoryData,
      currentMonthData,
      summary: {
        totalIncome: monthlyData.reduce((sum, m) => sum + m.income, 0),
        totalExpense: monthlyData.reduce((sum, m) => sum + m.expense, 0),
        totalSavings: monthlyData.reduce((sum, m) => sum + m.savings, 0),
        averageMonthlyIncome: monthlyData.reduce((sum, m) => sum + m.income, 0) / 12,
        averageMonthlyExpense: monthlyData.reduce((sum, m) => sum + m.expense, 0) / 12,
        currentNetWorth: currentMonthData?.netWorth || 0,
      },
    }
  } catch (error) {
    console.error('월별 분석 계산 에러:', error)
    throw error
  }
}

// 연간 분석 데이터 계산
async function getYearlyAnalytics(organizationId: string, targetYear: number) {
  try {
    const yearlyData = []
    
    // 최근 5년간 데이터 계산
    for (let year = targetYear - 4; year <= targetYear; year++) {
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31)
      
      // 해당 연도의 거래 데이터 조회
      const transactions = await prisma.transaction.findMany({
        where: {
          organizationId,
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      const income = transactions
        .filter(t => t.transactionType === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)
      
      const expense = transactions
        .filter(t => t.transactionType === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // 연말 순자산 계산
      const assets = await prisma.asset.findMany({
        where: {
          organizationId,
        },
      })
      
      const debts = await prisma.debt.findMany({
        where: {
          organizationId,
        },
      })

      const totalAssets = assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0)
      const totalDebts = debts.reduce((sum, debt) => sum + Number(debt.remainingAmount), 0)
      const netWorth = totalAssets - totalDebts

      yearlyData.push({
        year: year.toString(),
        income,
        expense,
        savings: income - expense,
        netWorth,
        transactionCount: transactions.length,
      })
    }

    // 성장률 계산
    const growthRates = yearlyData.map((data, index) => {
      if (index === 0) return { ...data, incomeGrowth: 0, netWorthGrowth: 0 }
      
      const prevData = yearlyData[index - 1]
      const incomeGrowth = prevData.income > 0 
        ? ((data.income - prevData.income) / prevData.income) * 100 
        : 0
      const netWorthGrowth = prevData.netWorth > 0 
        ? ((data.netWorth - prevData.netWorth) / prevData.netWorth) * 100 
        : 0

      return {
        ...data,
        incomeGrowth: Number(incomeGrowth.toFixed(1)),
        netWorthGrowth: Number(netWorthGrowth.toFixed(1)),
      }
    })

    return {
      yearlyTrend: growthRates,
      summary: {
        averageAnnualIncome: yearlyData.reduce((sum, y) => sum + y.income, 0) / yearlyData.length,
        averageAnnualExpense: yearlyData.reduce((sum, y) => sum + y.expense, 0) / yearlyData.length,
        totalNetWorthGrowth: yearlyData.length > 1 
          ? yearlyData[yearlyData.length - 1].netWorth - yearlyData[0].netWorth 
          : 0,
        averageIncomeGrowth: growthRates
          .slice(1)
          .reduce((sum, y) => sum + y.incomeGrowth, 0) / (growthRates.length - 1),
      },
    }
  } catch (error) {
    console.error('연간 분석 계산 에러:', error)
    throw error
  }
}

// 카테고리별 색상 지정
function getCategoryColor(categoryName: string): string {
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C',
    '#8DD1E1', '#D084D0', '#FFAB00', '#67B7DC',
  ]
  
  // 카테고리 이름의 해시값을 기반으로 색상 선택
  let hash = 0
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}