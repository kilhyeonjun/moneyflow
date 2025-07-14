'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedMonth, setSelectedMonth] = useState('1')

  // 월별 데이터 (Google Sheets 스타일)
  const [monthlyData] = useState([
    { month: '1월', income: 3500000, expense: 2800000, savings: 500000, netWorth: 24380685 },
    { month: '2월', income: 3500000, expense: 2900000, savings: 400000, netWorth: 24780685 },
    { month: '3월', income: 3600000, expense: 2700000, savings: 600000, netWorth: 25680685 },
    { month: '4월', income: 3500000, expense: 3000000, savings: 300000, netWorth: 25480685 },
    { month: '5월', income: 3700000, expense: 2600000, savings: 800000, netWorth: 26680685 },
    { month: '6월', income: 3500000, expense: 2800000, savings: 500000, netWorth: 27380685 },
    { month: '7월', income: 0, expense: 0, savings: 0, netWorth: 0 },
    { month: '8월', income: 0, expense: 0, savings: 0, netWorth: 0 },
    { month: '9월', income: 0, expense: 0, savings: 0, netWorth: 0 },
    { month: '10월', income: 0, expense: 0, savings: 0, netWorth: 0 },
    { month: '11월', income: 0, expense: 0, savings: 0, netWorth: 0 },
    { month: '12월', income: 0, expense: 0, savings: 0, netWorth: 0 },
  ])

  // 카테고리별 지출 분석
  const [categoryAnalysis] = useState([
    { name: '식비', amount: 800000, percentage: 28.6, color: '#0088FE' },
    { name: '교통비', amount: 300000, percentage: 10.7, color: '#00C49F' },
    { name: '주거비', amount: 500000, percentage: 17.9, color: '#FFBB28' },
    { name: '문화생활', amount: 400000, percentage: 14.3, color: '#FF8042' },
    { name: '쇼핑', amount: 350000, percentage: 12.5, color: '#8884D8' },
    { name: '기타', amount: 450000, percentage: 16.1, color: '#82CA9D' },
  ])

  // 연간 추이 데이터
  const [yearlyTrend] = useState([
    { year: '2021', netWorth: 15000000, income: 40000000, expense: 32000000 },
    { year: '2022', netWorth: 18500000, income: 42000000, expense: 33500000 },
    { year: '2023', netWorth: 21200000, income: 44000000, expense: 35000000 },
    { year: '2024', netWorth: 24380685, income: 45000000, expense: 36000000 },
    { year: '2025', netWorth: 27000000, income: 46000000, expense: 37000000 }, // 예상
  ])

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

      // TODO: Load actual analytics data from database
    } catch (error) {
      console.error('데이터 로드 실패:', error)
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

  const currentMonthData = monthlyData[parseInt(selectedMonth) - 1]

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
          <p className="text-gray-600">재정 현황을 다각도로 분석하고 인사이트를 얻으세요</p>
        </div>
        <div className="flex gap-2">
          <Select
            label="연도"
            selectedKeys={[selectedYear]}
            onSelectionChange={(keys) => setSelectedYear(Array.from(keys)[0] as string)}
            className="w-32"
          >
            <SelectItem key="2023">2023년</SelectItem>
            <SelectItem key="2024">2024년</SelectItem>
            <SelectItem key="2025">2025년</SelectItem>
          </Select>
          <Select
            label="월"
            selectedKeys={[selectedMonth]}
            onSelectionChange={(keys) => setSelectedMonth(Array.from(keys)[0] as string)}
            className="w-32"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={(i + 1).toString()}>
                {i + 1}월
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <Tabs aria-label="분석 탭" className="w-full">
        <Tab key="monthly" title="월별 분석">
          <div className="space-y-6">
            {/* 월별 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">{selectedMonth}월 수입</h3>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(currentMonthData?.income || 0)}
                  </div>
                </CardBody>
              </Card>

              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">{selectedMonth}월 지출</h3>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(currentMonthData?.expense || 0)}
                  </div>
                </CardBody>
              </Card>

              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">{selectedMonth}월 저축</h3>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(currentMonthData?.savings || 0)}
                  </div>
                </CardBody>
              </Card>

              <Card className="p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-600">순자산</h3>
                  <Calendar className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(currentMonthData?.netWorth || 0)}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* 월별 추이 차트 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">월별 수입/지출/저축 추이</h3>
              </CardHeader>
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData.filter(d => d.income > 0 || d.expense > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '']}
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
                  <h3 className="text-lg font-semibold">카테고리별 지출 분포</h3>
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
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {categoryAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), '금액']} />
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
            {/* 연간 순자산 추이 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">연간 순자산 추이</h3>
              </CardHeader>
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `${(value / 10000000).toFixed(0)}천만`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '순자산']}
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
              </CardHeader>
              <CardBody>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `${(value / 10000000).toFixed(0)}천만`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '']}
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
    </div>
  )
}
