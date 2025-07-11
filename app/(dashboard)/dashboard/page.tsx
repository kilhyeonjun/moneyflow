'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Button, Chip } from '@heroui/react'
import { TrendingUp, TrendingDown, Wallet, Target, Plus, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface DashboardStats {
  monthlyIncome: number
  monthlyExpense: number
  monthlySavings: number
  totalBalance: number
  previousMonthIncome: number
  previousMonthExpense: number
  previousMonthSavings: number
}

interface TransactionWithDetails extends Transaction {
  categories: {
    name: string
    transaction_type: string
  } | null
  payment_methods: {
    name: string
  } | null
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
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([])

  useEffect(() => {
    checkOrganizationSelection()
  }, [])

  useEffect(() => {
    if (selectedOrgId) {
      loadDashboardData()
    }
  }, [selectedOrgId])

  const checkOrganizationSelection = async () => {
    try {
      const storedOrgId = localStorage.getItem('selectedOrganization')

      if (!storedOrgId) {
        router.push('/organizations')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', storedOrgId)
        .single()

      if (error || !data) {
        localStorage.removeItem('selectedOrganization')
        router.push('/organizations')
        return
      }

      setSelectedOrgId(storedOrgId)
    } catch (error) {
      console.error('조직 확인 실패:', error)
      router.push('/organizations')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    if (!selectedOrgId) return

    try {
      // 현재 월과 이전 월 계산
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear

      // 현재 월 거래 데이터 조회
      const { data: currentMonthTransactions, error: currentError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, transaction_type),
          payment_methods (name)
        `)
        .eq('organization_id', selectedOrgId)
        .gte('transaction_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('transaction_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)

      if (currentError) {
        console.error('현재 월 거래 조회 실패:', currentError)
        return
      }

      // 이전 월 거래 데이터 조회
      const { data: previousMonthTransactions, error: previousError } = await supabase
        .from('transactions')
        .select('*')
        .eq('organization_id', selectedOrgId)
        .gte('transaction_date', `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`)
        .lt('transaction_date', `${previousYear}-${currentMonth.toString().padStart(2, '0')}-01`)

      if (previousError) {
        console.error('이전 월 거래 조회 실패:', previousError)
      }

      // 최근 거래 내역 (최근 5개)
      const { data: recentData, error: recentError } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, transaction_type),
          payment_methods (name)
        `)
        .eq('organization_id', selectedOrgId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) {
        console.error('최근 거래 조회 실패:', recentError)
      } else {
        setRecentTransactions(recentData || [])
      }

      // 통계 계산
      const currentStats = calculateStats(currentMonthTransactions || [])
      const previousStats = calculateStats(previousMonthTransactions || [])

      setStats({
        ...currentStats,
        previousMonthIncome: previousStats.monthlyIncome,
        previousMonthExpense: previousStats.monthlyExpense,
        previousMonthSavings: previousStats.monthlySavings,
      })

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    }
  }

  const calculateStats = (transactions: Transaction[]): Omit<DashboardStats, 'previousMonthIncome' | 'previousMonthExpense' | 'previousMonthSavings'> => {
    let monthlyIncome = 0
    let monthlyExpense = 0
    let monthlySavings = 0

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount)
      
      switch (transaction.transaction_type) {
        case 'income':
          monthlyIncome += amount
          break
        case 'expense':
          monthlyExpense += amount
          break
        case 'savings':
          monthlySavings += amount
          break
      }
    })

    const totalBalance = monthlyIncome - monthlyExpense - monthlySavings

    return {
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      totalBalance,
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'income':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'expense':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'savings':
        return <Wallet className="w-4 h-4 text-blue-500" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }

  const getTransactionColor = (transactionType: string) => {
    switch (transactionType) {
      case 'income':
        return 'success'
      case 'expense':
        return 'danger'
      case 'savings':
        return 'primary'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const incomeChange = calculatePercentageChange(stats.monthlyIncome, stats.previousMonthIncome)
  const expenseChange = calculatePercentageChange(stats.monthlyExpense, stats.previousMonthExpense)
  const savingsChange = calculatePercentageChange(stats.monthlySavings, stats.previousMonthSavings)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-600">가계부 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 수입</h3>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.monthlyIncome)}
            </div>
            <p className={`text-xs ${incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              전월 대비 {incomeChange >= 0 ? '+' : ''}{incomeChange}%
            </p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 지출</h3>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.monthlyExpense)}
            </div>
            <p className={`text-xs ${expenseChange <= 0 ? 'text-green-500' : 'text-red-500'}`}>
              전월 대비 {expenseChange >= 0 ? '+' : ''}{expenseChange}%
            </p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 저축</h3>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.monthlySavings)}
            </div>
            <p className={`text-xs ${savingsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              전월 대비 {savingsChange >= 0 ? '+' : ''}{savingsChange}%
            </p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 수지</h3>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className={`text-2xl font-bold ${stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalBalance)}
            </div>
            <p className="text-xs text-gray-500">
              {stats.totalBalance >= 0 ? '흑자' : '적자'} 운영
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold">최근 거래 내역</h3>
          <Button
            size="sm"
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => router.push('/transactions')}
          >
            거래 추가
          </Button>
        </CardHeader>
        <CardBody>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>거래 내역이 없습니다.</p>
              <p className="text-sm mt-2">첫 번째 거래를 추가해보세요!</p>
              <Button
                className="mt-4"
                color="primary"
                onPress={() => router.push('/transactions')}
              >
                거래 추가하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Chip
                          color={getTransactionColor(transaction.transaction_type) as any}
                          size="sm"
                          variant="flat"
                        >
                          {transaction.categories?.name}
                        </Chip>
                        <span className="text-sm text-gray-500">
                          {transaction.payment_methods?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transaction_type === 'income' 
                        ? 'text-green-600' 
                        : transaction.transaction_type === 'expense'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.transaction_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
              
              {recentTransactions.length >= 5 && (
                <div className="text-center pt-4">
                  <Button
                    variant="light"
                    color="primary"
                    onPress={() => router.push('/transactions')}
                  >
                    모든 거래 보기
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}