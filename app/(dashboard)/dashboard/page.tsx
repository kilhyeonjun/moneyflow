'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Button, Chip } from '@heroui/react'
import { TrendingUp, TrendingDown, Wallet, Target, Plus, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart'
import CategoryPieChart from '@/components/dashboard/CategoryPieChart'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: { name: string; transaction_type: string }
  payment_methods?: { name: string }
}

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
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalBalance: 0,
    previousMonthIncome: 0,
    previousMonthExpense: 0,
    previousMonthSavings: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    checkOrganizationAndLoadData()
  }, [])

  const checkOrganizationAndLoadData = async () => {
    try {
      const storedOrgId = localStorage.getItem('selectedOrganization')
      
      if (!storedOrgId) {
        router.push('/organizations')
        return
      }

      setSelectedOrgId(storedOrgId)
      await loadDashboardData(storedOrgId)
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async (orgId: string) => {
    try {
      // 모든 거래 내역 로드
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, transaction_type),
          payment_methods (name)
        `)
        .eq('organization_id', orgId)
        .order('transaction_date', { ascending: false })

      if (transactionsError) {
        console.error('거래 내역 로드 실패:', transactionsError)
        return
      }

      const allTxns = transactions || []
      setAllTransactions(allTxns)
      setRecentTransactions(allTxns.slice(0, 5))

      // 통계 계산
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

      const currentMonthTxns = allTxns.filter(txn => {
        const txnDate = new Date(txn.transaction_date)
        return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear
      })

      const previousMonthTxns = allTxns.filter(txn => {
        const txnDate = new Date(txn.transaction_date)
        return txnDate.getMonth() === previousMonth && txnDate.getFullYear() === previousYear
      })

      const calculateStats = (transactions: Transaction[]) => {
        return transactions.reduce((acc, txn) => {
          const type = txn.categories?.transaction_type || txn.transaction_type
          const amount = Math.abs(txn.amount)
          
          if (type === 'income') {
            acc.income += amount
          } else if (type === 'expense') {
            acc.expense += amount
          } else if (type === 'savings') {
            acc.savings += amount
          }
          
          return acc
        }, { income: 0, expense: 0, savings: 0 })
      }

      const currentStats = calculateStats(currentMonthTxns)
      const previousStats = calculateStats(previousMonthTxns)

      // 총 잔액 계산 (수입 - 지출)
      const totalBalance = allTxns.reduce((acc, txn) => {
        const type = txn.categories?.transaction_type || txn.transaction_type
        const amount = txn.amount
        
        if (type === 'income') {
          return acc + amount
        } else if (type === 'expense') {
          return acc - Math.abs(amount)
        }
        
        return acc
      }, 0)

      setStats({
        monthlyIncome: currentStats.income,
        monthlyExpense: currentStats.expense,
        monthlySavings: currentStats.savings,
        totalBalance,
        previousMonthIncome: previousStats.income,
        previousMonthExpense: previousStats.expense,
        previousMonthSavings: previousStats.savings,
      })

    } catch (error) {
      console.error('대시보드 데이터 처리 실패:', error)
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-gray-600">재정 현황을 한눈에 확인하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => router.push('/transactions')}
        >
          거래 추가
        </Button>
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
                  <span className={`text-xs ${getChangeColor(getChangePercentage(stats.monthlyIncome, stats.previousMonthIncome))}`}>
                    {getChangePercentage(stats.monthlyIncome, stats.previousMonthIncome) > 0 ? '↑' : '↓'}
                    {Math.abs(getChangePercentage(stats.monthlyIncome, stats.previousMonthIncome)).toFixed(1)}%
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
                  <span className={`text-xs ${getChangeColor(getChangePercentage(stats.monthlyExpense, stats.previousMonthExpense), true)}`}>
                    {getChangePercentage(stats.monthlyExpense, stats.previousMonthExpense) > 0 ? '↑' : '↓'}
                    {Math.abs(getChangePercentage(stats.monthlyExpense, stats.previousMonthExpense)).toFixed(1)}%
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
                  <span className={`text-xs ${getChangeColor(getChangePercentage(stats.monthlySavings, stats.previousMonthSavings))}`}>
                    {getChangePercentage(stats.monthlySavings, stats.previousMonthSavings) > 0 ? '↑' : '↓'}
                    {Math.abs(getChangePercentage(stats.monthlySavings, stats.previousMonthSavings)).toFixed(1)}%
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
                <p className={`text-2xl font-bold ${stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MonthlyTrendChart transactions={allTransactions} />
        <CategoryPieChart transactions={allTransactions} type="expense" />
      </div>

      {/* 최근 거래 내역 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <h3 className="text-lg font-semibold">최근 거래 내역</h3>
            <Button
              size="sm"
              variant="light"
              onPress={() => router.push('/transactions')}
            >
              전체 보기
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">거래 내역이 없습니다</h3>
              <p className="text-gray-500 mb-4">첫 번째 거래를 추가해보세요!</p>
              <Button color="primary" onPress={() => router.push('/transactions')}>
                거래 추가하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full">
                      {transaction.categories?.transaction_type === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : transaction.categories?.transaction_type === 'expense' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <Wallet className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Chip size="sm" variant="flat">
                          {transaction.categories?.name || '기타'}
                        </Chip>
                        <span className="text-xs text-gray-500">
                          {new Date(transaction.transaction_date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.categories?.transaction_type === 'income' 
                        ? 'text-green-600' 
                        : transaction.categories?.transaction_type === 'expense'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}>
                      {transaction.categories?.transaction_type === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.payment_methods?.name}
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
