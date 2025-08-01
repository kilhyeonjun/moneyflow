'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardHeader, CardBody, Button, Chip } from '@heroui/react'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'

// Import server actions and types
import { getDashboardData } from '@/lib/server-actions/dashboard'
import { handleServerActionResult } from '@/components/error/ErrorBoundary'
import { transformTransactionForFrontend } from '@/lib/types'

// Use the actual transformation type from server actions
type TransactionForFrontend = ReturnType<typeof transformTransactionForFrontend>

interface DashboardStats {
  monthlyIncome: number
  monthlyExpense: number
  monthlySavings: number
  totalBalance: number
  previousMonthIncome: number
  previousMonthExpense: number
  previousMonthSavings: number
}

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalBalance: 0,
    previousMonthIncome: 0,
    previousMonthExpense: 0,
    previousMonthSavings: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<
    TransactionForFrontend[]
  >([])
  const [allTransactions, setAllTransactions] = useState<
    TransactionForFrontend[]
  >([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orgId) {
      loadDashboardData(orgId)
    }
  }, [orgId])

  const loadDashboardData = async (organizationId: string) => {
    setLoading(true)
    setError(null)

    try {
      // Load dashboard data using server action
      const result = await getDashboardData(organizationId)
      const data = handleServerActionResult(result)

      if (process.env.NODE_ENV === 'development') {
        console.log('로드된 대시보드 데이터:', data)
      }

      // Set data from server action result
      if (data) {
        const {
          stats: dashboardStats,
          recentTransactions: recent,
          allTransactions: all,
        } = data
        setStats(dashboardStats)
        setRecentTransactions(recent)
        setAllTransactions(all)
      }
    } catch (error) {
      console.error('대시보드 데이터 처리 실패:', error)

      // Handle specific errors that should not go to Error Boundary
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        setError('이 조직에 접근할 권한이 없습니다.')
        return
      }

      // Re-throw other errors to be handled by Error Boundary
      throw error
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const getChangeColor = (change: number, isExpense = false) => {
    if (change === 0) return 'text-gray-500'
    if (isExpense) {
      return change > 0 ? 'text-red-500' : 'text-green-500'
    }
    return change > 0 ? 'text-green-500' : 'text-red-500'
  }

  const retryLoadData = () => {
    if (orgId) {
      loadDashboardData(orgId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            데이터 로드 오류
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button color="primary" onPress={retryLoadData}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-gray-600">재정 현황을 한눈에 확인하세요</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 이번 달 수입 */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">이번 달 수입</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.monthlyIncome)}
                </p>
                <div className="flex items-center mt-2">
                  <span
                    className={`text-xs ${getChangeColor(getChangePercentage(stats.monthlyIncome, stats.previousMonthIncome))}`}
                  >
                    {getChangePercentage(
                      stats.monthlyIncome,
                      stats.previousMonthIncome
                    ) > 0
                      ? '↑'
                      : '↓'}
                    {Math.abs(
                      getChangePercentage(
                        stats.monthlyIncome,
                        stats.previousMonthIncome
                      )
                    ).toFixed(1)}
                    %
                  </span>
                  <span className="text-xs text-gray-500 ml-1">전월 대비</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 이번 달 지출 */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">이번 달 지출</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.monthlyExpense)}
                </p>
                <div className="flex items-center mt-2">
                  <span
                    className={`text-xs ${getChangeColor(getChangePercentage(stats.monthlyExpense, stats.previousMonthExpense), true)}`}
                  >
                    {getChangePercentage(
                      stats.monthlyExpense,
                      stats.previousMonthExpense
                    ) > 0
                      ? '↑'
                      : '↓'}
                    {Math.abs(
                      getChangePercentage(
                        stats.monthlyExpense,
                        stats.previousMonthExpense
                      )
                    ).toFixed(1)}
                    %
                  </span>
                  <span className="text-xs text-gray-500 ml-1">전월 대비</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 이번 달 저축 */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">이번 달 저축</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.monthlySavings)}
                </p>
                <div className="flex items-center mt-2">
                  <span
                    className={`text-xs ${getChangeColor(getChangePercentage(stats.monthlySavings, stats.previousMonthSavings))}`}
                  >
                    {getChangePercentage(
                      stats.monthlySavings,
                      stats.previousMonthSavings
                    ) > 0
                      ? '↑'
                      : '↓'}
                    {Math.abs(
                      getChangePercentage(
                        stats.monthlySavings,
                        stats.previousMonthSavings
                      )
                    ).toFixed(1)}
                    %
                  </span>
                  <span className="text-xs text-gray-500 ml-1">전월 대비</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 총 잔액 */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 잔액</p>
                <p
                  className={`text-2xl font-bold ${stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(stats.totalBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-2">누적 수입 - 지출</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <MonthlyTrendChart transactions={allTransactions} />
      </div>

      {/* 최근 거래 내역 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <h3 className="text-lg font-semibold">최근 거래 내역</h3>
            <Button
              size="sm"
              variant="light"
              onPress={() => router.push(`/org/${orgId}/transactions`)}
            >
              전체 보기
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                거래 내역이 없습니다
              </h3>
              <p className="text-gray-500 mb-4">첫 번째 거래를 추가해보세요!</p>
              <Button
                color="primary"
                onPress={() => router.push(`/org/${orgId}/transactions`)}
              >
                거래 추가하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full">
                      {transaction.transactionType === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : transaction.transactionType === 'expense' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <Wallet className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {transaction.transactionDate
                            ? new Date(
                                transaction.transactionDate
                              ).toLocaleDateString('ko-KR')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.transactionType === 'income'
                          ? 'text-green-600'
                          : transaction.transactionType === 'expense'
                            ? 'text-red-600'
                            : 'text-blue-600'
                      }`}
                    >
                      {transaction.transactionType === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(Number(transaction.amount)))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.paymentMethod?.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
