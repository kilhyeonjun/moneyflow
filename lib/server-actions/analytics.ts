'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { validateUserAndOrganization } from '@/lib/auth-server'
import {
  ServerActionError,
} from '@/lib/types'
import {
  BaseServerAction,
  createServerAction,
} from './base'

// Analytics related types
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

class AnalyticsActions extends BaseServerAction {
  /**
   * Get analytics data for organization
   */
  async getAnalyticsData(input: {
    organizationId: string
    period: 'monthly' | 'yearly'
    year: string
    month?: string
  }): Promise<AnalyticsData> {
    await this.validateAuth(input.organizationId)

    const { organizationId, period, year, month } = input
    const yearNum = parseInt(year)
    const monthNum = month ? parseInt(month) : undefined

    if (period === 'monthly') {
      return this.getMonthlyAnalytics(organizationId, yearNum, monthNum)
    } else {
      return this.getYearlyAnalytics(organizationId, yearNum)
    }
  }

  private async getMonthlyAnalytics(
    organizationId: string,
    year: number,
    month?: number
  ): Promise<AnalyticsData> {
    // Get monthly transaction data for the year
    const monthlyData: MonthlyData[] = []
    const categoryData: { [key: string]: { amount: number; count: number; name: string } } = {}

    for (let m = 1; m <= 12; m++) {
      const startDate = new Date(year, m - 1, 1)
      const endDate = new Date(year, m, 0, 23, 59, 59)

      // Get transactions for the month
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

      // Calculate monthly totals
      let income = 0
      let expense = 0
      
      transactions.forEach(transaction => {
        const amount = Number(transaction.amount)
        if (amount > 0) {
          income += amount
        } else {
          expense += Math.abs(amount)
          
          // Track category data for expense analysis
          if (transaction.category) {
            const categoryName = transaction.category.name
            if (!categoryData[categoryName]) {
              categoryData[categoryName] = {
                amount: 0,
                count: 0,
                name: categoryName,
              }
            }
            categoryData[categoryName].amount += Math.abs(amount)
            categoryData[categoryName].count += 1
          }
        }
      })

      const savings = income - expense
      
      monthlyData.push({
        month: `${m}월`,
        monthNumber: m,
        income,
        expense,
        savings,
        netWorth: 0, // Would need asset data for accurate net worth
        transactionCount: transactions.length,
      })
    }

    // Get current month data
    const currentMonthData = month ? monthlyData.find(m => m.monthNumber === month) : null

    // Create category analysis with colors
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#10AC84', '#EE5A24', '#0F3460', '#F25287', '#5F27CD'
    ]
    
    const totalExpense = Object.values(categoryData).reduce((sum, cat) => sum + cat.amount, 0)
    const categoryAnalysis: CategoryAnalysis[] = Object.values(categoryData)
      .map((cat, index) => ({
        name: cat.name,
        amount: cat.amount,
        count: cat.count,
        percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10) // Top 10 categories

    // Calculate summary
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0)
    const totalExpenseSum = monthlyData.reduce((sum, m) => sum + m.expense, 0)
    const totalSavings = totalIncome - totalExpenseSum

    const summary = {
      totalIncome,
      totalExpense: totalExpenseSum,
      totalSavings,
      averageMonthlyIncome: totalIncome / 12,
      averageMonthlyExpense: totalExpenseSum / 12,
      currentNetWorth: 0, // Would need asset data
    }

    return {
      monthlyData,
      categoryAnalysis,
      currentMonthData: currentMonthData || undefined,
      summary,
    }
  }

  private async getYearlyAnalytics(
    organizationId: string,
    currentYear: number
  ): Promise<AnalyticsData> {
    const yearlyData: YearlyData[] = []
    
    // Get data for current year and previous 4 years
    for (let y = currentYear - 4; y <= currentYear; y++) {
      const startDate = new Date(y, 0, 1)
      const endDate = new Date(y, 11, 31, 23, 59, 59)

      // Get transactions for the year
      const transactions = await prisma.transaction.findMany({
        where: {
          organizationId,
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      // Calculate yearly totals
      let income = 0
      let expense = 0
      
      transactions.forEach(transaction => {
        const amount = Number(transaction.amount)
        if (amount > 0) {
          income += amount
        } else {
          expense += Math.abs(amount)
        }
      })

      const savings = income - expense
      
      // Calculate growth rates (simplified)
      const prevYearData = yearlyData[yearlyData.length - 1]
      const incomeGrowth = prevYearData && prevYearData.income > 0
        ? ((income - prevYearData.income) / prevYearData.income) * 100
        : 0
      const netWorthGrowth = prevYearData
        ? savings - prevYearData.savings
        : 0

      yearlyData.push({
        year: y.toString(),
        income,
        expense,
        savings,
        netWorth: savings, // Simplified - would need asset data
        transactionCount: transactions.length,
        incomeGrowth,
        netWorthGrowth,
      })
    }

    // Calculate summary for yearly data
    const totalIncome = yearlyData.reduce((sum, y) => sum + y.income, 0)
    const totalExpense = yearlyData.reduce((sum, y) => sum + y.expense, 0)
    const totalSavings = totalIncome - totalExpense
    const averageAnnualIncome = yearlyData.length > 0 ? totalIncome / yearlyData.length : 0
    const averageAnnualExpense = yearlyData.length > 0 ? totalExpense / yearlyData.length : 0
    const totalNetWorthGrowth = yearlyData.length > 0 
      ? yearlyData[yearlyData.length - 1].netWorth - (yearlyData[0]?.netWorth || 0)
      : 0
    const averageIncomeGrowth = yearlyData.length > 1
      ? yearlyData.slice(1).reduce((sum, y) => sum + y.incomeGrowth, 0) / (yearlyData.length - 1)
      : 0

    const summary = {
      totalIncome,
      totalExpense,
      totalSavings,
      averageMonthlyIncome: averageAnnualIncome / 12,
      averageMonthlyExpense: averageAnnualExpense / 12,
      currentNetWorth: yearlyData[yearlyData.length - 1]?.netWorth || 0,
      averageAnnualIncome,
      averageAnnualExpense,
      totalNetWorthGrowth,
      averageIncomeGrowth,
    }

    return {
      yearlyTrend: yearlyData,
      summary,
    }
  }
}

// Create instance and export wrapped methods
const analyticsActions = new AnalyticsActions()

// Export server actions with error handling
export const getAnalyticsData = createServerAction(
  async (input: {
    organizationId: string
    period: 'monthly' | 'yearly'
    year: string
    month?: string
  }) => analyticsActions.getAnalyticsData(input)
)