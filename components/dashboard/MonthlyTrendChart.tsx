'use client'

import { Card, CardBody, CardHeader } from '@heroui/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Use the transformed transaction type from server actions
import { transformTransactionForFrontend } from '@/lib/types'

type TransactionForChart = ReturnType<typeof transformTransactionForFrontend>

interface MonthlyTrendChartProps {
  transactions: TransactionForChart[]
}

type MonthlyDataItem = {
  month: string
  income: number
  expense: number
  savings: number
}

export default function MonthlyTrendChart({
  transactions,
}: MonthlyTrendChartProps) {
  // 월별 데이터 집계
  const monthlyData = transactions.reduce(
    (acc, transaction) => {
      // Handle transaction date safely
      if (!transaction.transactionDate) return acc
      
      const date = new Date(transaction.transactionDate)
      if (isNaN(date.getTime())) return acc // Skip invalid dates
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          income: 0,
          expense: 0,
          savings: 0,
        }
      }

      const amount = Math.abs(Number(transaction.amount))
      const type = transaction.transactionType || 'expense'

      if (type === 'income') {
        acc[monthKey].income += amount
      } else if (type === 'expense') {
        acc[monthKey].expense += amount
      } else if (type === 'transfer') {
        // For now, treat transfers as savings
        acc[monthKey].savings += amount
      }

      return acc
    },
    {} as Record<string, MonthlyDataItem>
  )

  // 데이터를 배열로 변환하고 정렬
  const chartData = Object.values(monthlyData)
    .sort((a: MonthlyDataItem, b: MonthlyDataItem) => a.month.localeCompare(b.month))
    .map((item: MonthlyDataItem) => ({
      ...item,
      month: new Date(item.month + '-01').toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
      }),
    }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">월별 수입/지출 추이</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-center h-64 text-gray-500">
            데이터가 없습니다
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">월별 수입/지출 추이</h3>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#22c55e"
                strokeWidth={2}
                name="수입"
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                name="지출"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#3b82f6"
                strokeWidth={2}
                name="저축"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
