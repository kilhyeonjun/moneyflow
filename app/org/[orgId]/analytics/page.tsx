'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from '@heroui/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import { Calendar, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { getAnalyticsData } from '@/lib/server-actions/analytics'
import { handleServerActionResult, useErrorHandler } from '@/components/error/ErrorBoundary'
import { createClient } from '@/lib/supabase'

interface MonthlyData {
  month: string
  monthNumber: number
  income: number
  expense: number
  savings: number
  netWorth: number
  transactionCount: number
}

interface CategoryAnalysis {
  name: string
  amount: number
  count: number
  percentage: number
  color: string
}

interface YearlyData {
  year: string
  income: number
  expense: number
  savings: number
  netWorth: number
  transactionCount: number
  incomeGrowth: number
  netWorthGrowth: number
}

interface AnalyticsData {
  monthlyData?: MonthlyData[]
  categoryAnalysis?: CategoryAnalysis[]
  currentMonthData?: MonthlyData
  yearlyTrend?: YearlyData[]
  summary?: {
    totalIncome: number
    totalExpense: number
    totalSavings: number
    averageMonthlyIncome: number
    averageMonthlyExpense: number
    currentNetWorth: number
    averageAnnualIncome?: number
    averageAnnualExpense?: number
    totalNetWorthGrowth?: number
    averageIncomeGrowth?: number
  }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string
  const { handleError } = useErrorHandler()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString())
  
  // 실제 데이터 상태
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({})
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis[]>([])
  const [yearlyTrend, setYearlyTrend] = useState<YearlyData[]>([])
  const [currentMonthData, setCurrentMonthData] = useState<MonthlyData | null>(null)

  useEffect(() => {
    if (orgId) {
      loadAnalyticsData('monthly')
    }
  }, [orgId])

  useEffect(() => {
    if (orgId) {
      loadAnalyticsData('monthly')
    }
  }, [orgId, selectedYear, selectedMonth])

  const loadAnalyticsData = async (period: 'monthly' | 'yearly') => {
    if (!orgId) return
    
    try {
      setRefreshing(true)

      // 사용자 인증 상태 확인 (Supabase Auth 유지)
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        toast.error('사용자 인증에 실패했습니다.')
        return
      }

      if (!user) {
        toast.error('로그인이 필요합니다.')
        router.push('/login')
        return
      }

      // 서버 액션으로 분석 데이터 로드
      const data = handleServerActionResult(await getAnalyticsData({
        organizationId: orgId,
        period,
        year: selectedYear,
        month: period === 'monthly' ? selectedMonth : undefined,
      }))
      setAnalyticsData(data)

      if (period === 'monthly') {
        setMonthlyData(data.monthlyData || [])
        setCategoryAnalysis(data.categoryAnalysis || [])
        setCurrentMonthData(data.currentMonthData || null)
      } else {
        setYearlyTrend(data.yearlyTrend || [])
      }

      console.log('📊 분석 데이터 로드 완료:', data)
    } catch (error) {
      const errorMessage = handleError(error, 'loadAnalyticsData')
      if (errorMessage) {
        toast.error(`분석 데이터 로드 실패: ${errorMessage}`)
      }
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadAnalyticsData('monthly')
    loadAnalyticsData('yearly')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getCurrentMonthData = () => {
    return currentMonthData || monthlyData.find(m => m.monthNumber === parseInt(selectedMonth))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">통계 분석</h1>
          <p className="text-gray-600">
            재정 현황을 다각도로 분석하고 인사이트를 얻으세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            isIconOnly
            variant="light"
            onPress={handleRefresh}
            isLoading={refreshing}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Select
            label="연도"
            selectedKeys={[selectedYear]}
            onSelectionChange={keys =>
              setSelectedYear(Array.from(keys)[0] as string)
            }
            className="w-32"
            classNames={{
              trigger: "text-gray-900 bg-white",
              value: "text-gray-900",
              label: "text-gray-600"
            }}
            renderValue={(items) => {
              return items.map((item) => (
                <span key={item.key} className="text-gray-900">
                  {item.key}년
                </span>
              ))
            }}
          >
            <SelectItem key="2023">2023년</SelectItem>
            <SelectItem key="2024">2024년</SelectItem>
            <SelectItem key="2025">2025년</SelectItem>
          </Select>
          <Select
            label="월"
            selectedKeys={selectedMonth ? [selectedMonth] : []}
            defaultSelectedKeys={[selectedMonth]}
            onSelectionChange={keys => {
              const selectedKey = Array.from(keys)[0] as string
              if (selectedKey) {
                setSelectedMonth(selectedKey)
              }
            }}
            className="w-32"
            placeholder="월 선택"
            classNames={{
              trigger: "text-gray-900 bg-white",
              value: "text-gray-900",
              label: "text-gray-600"
            }}
            renderValue={(items) => {
              return items.map((item) => (
                <span key={item.key} className="text-gray-900">
                  {item.key}월
                </span>
              ))
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={(i + 1).toString()}>{i + 1}월</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <Tabs 
        aria-label="분석 탭" 
        className="w-full"
        onSelectionChange={(key) => {
          if (key === 'yearly') {
            loadAnalyticsData('yearly')
          }
        }}
      >
        <Tab key="monthly" title="월별 분석">
          <div className="space-y-6">
            {/* 월별 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    {selectedMonth}월 수입
                  </h3>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(getCurrentMonthData()?.income || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    거래 {getCurrentMonthData()?.transactionCount || 0}건
                  </p>
                </CardBody>
              </Card>

              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    {selectedMonth}월 지출
                  </h3>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(getCurrentMonthData()?.expense || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {categoryAnalysis.length}개 카테고리
                  </p>
                </CardBody>
              </Card>

              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    {selectedMonth}월 저축
                  </h3>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(getCurrentMonthData()?.savings || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    저축률 {getCurrentMonthData()?.income ? 
                      ((getCurrentMonthData()!.savings / getCurrentMonthData()!.income) * 100).toFixed(1) : 0}%
                  </p>
                </CardBody>
              </Card>

              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">순자산</h3>
                  <Calendar className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(analyticsData.summary?.currentNetWorth || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    현재 총 자산
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* 월별 추이 차트 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">
                  {selectedYear}년 월별 수입/지출/저축 추이
                </h3>
                <p className="text-sm text-gray-600">
                  전체 거래: {analyticsData.summary?.totalIncome ? formatCurrency(analyticsData.summary.totalIncome) : '₩0'} 수입,
                  {analyticsData.summary?.totalExpense ? formatCurrency(analyticsData.summary.totalExpense) : '₩0'} 지출
                </p>
              </CardHeader>
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData.filter(
                        d => d.income > 0 || d.expense > 0 || d.savings !== 0
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={value =>
                          `${(value / 10000).toFixed(0)}만`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          '',
                        ]}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Bar dataKey="income" fill="#10B981" name="수입" />
                      <Bar dataKey="expense" fill="#EF4444" name="지출" />
                      <Bar dataKey="savings" fill="#3B82F6" name="저축" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            {/* 카테고리별 지출 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">
                    카테고리별 지출 분포
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryAnalysis}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name} ${percentage}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {categoryAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            '금액',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">카테고리별 상세</h3>
                </CardHeader>
                <CardBody>
                  <Table aria-label="카테고리별 지출 테이블">
                    <TableHeader>
                      <TableColumn>카테고리</TableColumn>
                      <TableColumn>금액</TableColumn>
                      <TableColumn>비율</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {categoryAnalysis.map((category, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {formatCurrency(category.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Chip color="primary" size="sm" variant="flat">
                              {category.percentage}%
                            </Chip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </div>
          </div>
        </Tab>

        <Tab key="yearly" title="연간 분석">
          <div className="space-y-6">
            {/* 연간 성장률 요약 카드 */}
            {analyticsData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="p-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <h3 className="text-sm font-medium text-gray-600">평균 연간 수입</h3>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(analyticsData.summary.averageAnnualIncome || 0)}
                    </div>
                  </CardBody>
                </Card>

                <Card className="p-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <h3 className="text-sm font-medium text-gray-600">순자산 증가</h3>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(analyticsData.summary.totalNetWorthGrowth || 0)}
                    </div>
                  </CardBody>
                </Card>

                <Card className="p-4">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <h3 className="text-sm font-medium text-gray-600">평균 성장률</h3>
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="text-lg font-bold text-purple-600">
                      {analyticsData.summary.averageIncomeGrowth?.toFixed(1) || 0}%
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* 연간 순자산 추이 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">연간 순자산 추이</h3>
                <p className="text-sm text-gray-600">
                  최근 5년간 자산 성장 현황
                </p>
              </CardHeader>
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis
                        tickFormatter={value =>
                          value >= 10000000 
                            ? `${(value / 10000000).toFixed(0)}천만`
                            : `${(value / 10000).toFixed(0)}만`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          '순자산',
                        ]}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="netWorth"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            {/* 연간 수입/지출 비교 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">연간 수입/지출 비교</h3>
                <p className="text-sm text-gray-600">
                  연도별 수입과 지출 변화 추이
                </p>
              </CardHeader>
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis
                        tickFormatter={value =>
                          value >= 10000000 
                            ? `${(value / 10000000).toFixed(0)}천만`
                            : `${(value / 10000).toFixed(0)}만`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          '',
                        ]}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="수입"
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        stroke="#EF4444"
                        strokeWidth={2}
                        name="지출"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Toast 알림 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}