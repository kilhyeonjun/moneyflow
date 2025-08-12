'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { validateUserAndOrganization } from '@/lib/auth-server'
import {
  TransactionWithDetails,
  ServerActionError,
  transformTransactionForFrontend,
} from '@/lib/types'
import {
  BaseServerAction,
  createServerAction,
  TransactionAggregation,
} from './base'

interface DashboardStats {
  monthlyIncome: number
  monthlyExpense: number
  monthlySavings: number
  totalBalance: number
  previousMonthIncome: number
  previousMonthExpense: number
  previousMonthSavings: number
}

interface DashboardData {
  stats: DashboardStats
  recentTransactions: ReturnType<typeof transformTransactionForFrontend>[]
  allTransactions: ReturnType<typeof transformTransactionForFrontend>[]
}

class DashboardActions extends BaseServerAction {
  /**
   * Helper function to enrich transactions with category information
   */
  private async enrichTransactionsWithCategories<T extends { categoryId: string | null, [key: string]: any }>(
    transactions: T[],
    organizationId: string
  ): Promise<(T & { category?: { id: string; name: string; type: string; parent?: { id: string; name: string; type: string } | null } | null })[]> {
    if (transactions.length === 0) return []

    // Get unique category IDs
    const categoryIds = [...new Set(
      transactions
        .map(t => t.categoryId)
        .filter(Boolean)
    )] as string[]

    if (categoryIds.length === 0) {
      return transactions.map(t => ({ ...t, category: null }))
    }

    // Fetch all categories at once
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        organizationId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        parentId: true
      }
    })

    // Get parent categories for hierarchical data
    const parentIds = [...new Set(
      categories
        .map(c => c.parentId)
        .filter(Boolean)
    )] as string[]

    const parentCategories = parentIds.length > 0 ?
      await prisma.category.findMany({
        where: {
          id: { in: parentIds },
          organizationId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      }) : []

    // Create lookup maps
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const parentMap = new Map(parentCategories.map(c => [c.id, c]))

    // Enrich transactions with category information
    return transactions.map(transaction => {
      const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : null
      const enrichedCategory = category ? {
        id: category.id,
        name: category.name,
        type: category.type,
        parent: category.parentId ? parentMap.get(category.parentId) || null : null
      } : null

      return {
        ...transaction,
        category: enrichedCategory
      }
    })
  }

  /**
   * Get comprehensive dashboard data including stats and transactions
   */
  async getDashboardData(organizationId: string): Promise<DashboardData> {
    const { user } = await this.validateAuth(organizationId)

    // Get all transactions for the organization
    const transactions = await prisma.transaction.findMany({
      where: { organizationId },
      include: {
        paymentMethod: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      transactions,
      organizationId
    )

    // Transform for frontend compatibility
    const transformedTransactions = enrichedTransactions.map(
      transformTransactionForFrontend
    )

    // Calculate statistics
    const stats = this.calculateDashboardStats(transformedTransactions)

    // Get recent transactions (top 5)
    const recentTransactions = transformedTransactions.slice(0, 5)

    return {
      stats,
      recentTransactions,
      allTransactions: transformedTransactions,
    }
  }

  /**
   * Calculate dashboard statistics from transactions
   */
  private calculateDashboardStats(
    transactions: ReturnType<typeof transformTransactionForFrontend>[]
  ): DashboardStats {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

    // Filter transactions by month
    const currentMonthTxns = transactions.filter(txn => {
      if (!txn.transactionDate) return false
      const txnDate = new Date(txn.transactionDate)
      return (
        txnDate.getMonth() === currentMonth &&
        txnDate.getFullYear() === currentYear
      )
    })

    const previousMonthTxns = transactions.filter(txn => {
      if (!txn.transactionDate) return false
      const txnDate = new Date(txn.transactionDate)
      return (
        txnDate.getMonth() === previousMonth &&
        txnDate.getFullYear() === previousYear
      )
    })

    // Calculate stats for a set of transactions
    const calculateStats = (txns: typeof transactions) => {
      return txns.reduce(
        (acc, txn) => {
          const type = txn.transactionType || 'expense'
          const amount = Math.abs(Number(txn.amount))

          if (type === 'income') {
            acc.income += amount
          } else if (type === 'expense') {
            acc.expense += amount
          } else if (type === 'transfer') {
            // For now, treat transfers as savings
            acc.savings += amount
          }

          return acc
        },
        { income: 0, expense: 0, savings: 0 }
      )
    }

    const currentStats = calculateStats(currentMonthTxns)
    const previousStats = calculateStats(previousMonthTxns)

    // Calculate total balance (income - expense)
    const totalBalance = transactions.reduce((acc, txn) => {
      const type = txn.transactionType || 'expense'
      const amount = Number(txn.amount)

      if (type === 'income') {
        return acc + amount
      } else if (type === 'expense') {
        return acc - Math.abs(amount)
      }

      return acc
    }, 0)

    return {
      monthlyIncome: currentStats.income,
      monthlyExpense: currentStats.expense,
      monthlySavings: currentStats.savings,
      totalBalance,
      previousMonthIncome: previousStats.income,
      previousMonthExpense: previousStats.expense,
      previousMonthSavings: previousStats.savings,
    }
  }

  /**
   * Get recent transactions only (for components that only need recent data)
   */
  async getRecentTransactions(
    organizationId: string,
    limit: number = 5
  ): Promise<ReturnType<typeof transformTransactionForFrontend>[]> {
    await this.validateAuth(organizationId)

    const transactions = await prisma.transaction.findMany({
      where: { organizationId },
      include: {
        paymentMethod: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 20), // Cap at 20
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      transactions,
      organizationId
    )

    return enrichedTransactions.map(transformTransactionForFrontend)
  }

  /**
   * Get transactions for chart components
   */
  async getTransactionsForCharts(
    organizationId: string
  ): Promise<ReturnType<typeof transformTransactionForFrontend>[]> {
    await this.validateAuth(organizationId)

    const transactions = await prisma.transaction.findMany({
      where: { organizationId },
      include: {
        paymentMethod: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      transactions,
      organizationId
    )

    return enrichedTransactions.map(transformTransactionForFrontend)
  }
}

// Create instance and export wrapped methods
const dashboardActions = new DashboardActions()

// Export server actions with error handling
export const getDashboardData = createServerAction(
  async (organizationId: string) =>
    dashboardActions.getDashboardData(organizationId)
)

export const getRecentTransactions = createServerAction(
  async (organizationId: string, limit?: number) =>
    dashboardActions.getRecentTransactions(organizationId, limit)
)

export const getTransactionsForCharts = createServerAction(
  async (organizationId: string) =>
    dashboardActions.getTransactionsForCharts(organizationId)
)
