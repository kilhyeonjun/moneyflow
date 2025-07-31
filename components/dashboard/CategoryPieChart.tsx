'use client'

import { Card, CardBody, CardHeader } from '@heroui/react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

// Use the transformed transaction type from server actions
import { transformTransactionForFrontend } from '@/lib/types'

type TransactionForChart = ReturnType<typeof transformTransactionForFrontend>

interface CategoryPieChartProps {
  transactions: TransactionForChart[]
  type?: 'expense' | 'income' | 'transfer'
}

export default function CategoryPieChart({
  transactions,
  type = 'expense',
}: CategoryPieChartProps) {
  // 카테고리별 데이터 집계
  const categoryData = transactions
    .filter(transaction => {
      const transactionType = transaction.transactionType || 'expense'
      return transactionType === type
    })
    .reduce(
      (acc, transaction) => {
        const categoryName = transaction.category?.name || '기타'
        const amount = Math.abs(Number(transaction.amount))

        if (!acc[categoryName]) {
          acc[categoryName] = 0
        }

        acc[categoryName] += amount

        return acc
      },
      {} as Record<string, number>
    )

  // 데이터를 배열로 변환하고 정렬
  const chartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8) // 상위 8개만 표시

  // 색상 팔레트
  const COLORS = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#10b981',
    '#14b8a6',
    '#06b6d4',
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return '수입'
      case 'expense':
        return '지출'
      case 'transfer':
        return '이체'
      default:
        return '기타'
    }
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            카테고리별 {getTypeLabel(type)} 분석
          </h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-center h-64 text-gray-500">
            {getTypeLabel(type)} 데이터가 없습니다
          </div>
        </CardBody>
      </Card>
    )
  }

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    if (percent < 0.05) return null // 5% 미만은 라벨 숨김

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">
          카테고리별 {getTypeLabel(type)} 분석
        </h3>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '금액']}
                labelStyle={{ color: '#000' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={value => (
                  <span style={{ fontSize: '12px' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
