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

// Import Prisma types directly
import type { FinancialGoal } from '@prisma/client'

// Extended interfaces for goal data
interface GoalProgress {
  achievementRate: number
  currentAmount: number
  remainingAmount: number
  daysRemaining: number
  dailyTargetToReach: number
  projectedDays: number
  isOnTrack: boolean
  daysAheadBehind: number
  status: 'ahead' | 'on-track' | 'behind'
}

interface FinancialGoalWithProgress extends FinancialGoal {
  progress?: GoalProgress
}

class GoalActions extends BaseServerAction {
  /**
   * Get all financial goals for organization
   */
  async getGoals(organizationId: string): Promise<FinancialGoal[]> {
    await this.validateAuth(organizationId)

    const goals = await prisma.financialGoal.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    return goals
  }

  /**
   * Create financial goal
   */
  async createGoal(input: {
    name: string
    category?: string
    targetAmount: number
    targetDate: string
    priority?: string
    description?: string
    organizationId: string
  }): Promise<FinancialGoal> {
    await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, ['name', 'targetAmount', 'targetDate', 'organizationId'])

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Calculate current amount based on existing transactions and assets
    const currentAmount = await this.calculateCurrentGoalAmount(
      input.organizationId,
      sanitizedInput.category || 'asset_growth'
    )

    const goal = await prisma.financialGoal.create({
      data: {
        name: sanitizedInput.name!,
        category: sanitizedInput.category || 'asset_growth',
        targetAmount: Number(sanitizedInput.targetAmount),
        currentAmount: currentAmount,
        targetDate: new Date(sanitizedInput.targetDate!),
        priority: sanitizedInput.priority || 'medium',
        description: sanitizedInput.description,
        organizationId: sanitizedInput.organizationId!,
      },
    })

    // Revalidate goals page
    revalidatePath(`/org/${input.organizationId}/goals`)

    return goal
  }

  /**
   * Update financial goal
   */
  async updateGoal(input: {
    id: string
    name?: string
    category?: string
    targetAmount?: number
    targetDate?: string
    priority?: string
    description?: string
    organizationId: string
  }): Promise<FinancialGoal> {
    await this.validateAuth(input.organizationId)
    this.validateUUID(input.id, 'Goal ID')

    // Check if goal exists and belongs to organization
    const existingGoal = await prisma.financialGoal.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingGoal) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Prepare update data
    const updateData: any = {}
    if (sanitizedInput.name !== undefined) updateData.name = sanitizedInput.name
    if (sanitizedInput.category !== undefined) updateData.category = sanitizedInput.category
    if (sanitizedInput.targetAmount !== undefined) updateData.targetAmount = Number(sanitizedInput.targetAmount)
    if (sanitizedInput.targetDate !== undefined) updateData.targetDate = new Date(sanitizedInput.targetDate)
    if (sanitizedInput.priority !== undefined) updateData.priority = sanitizedInput.priority
    if (sanitizedInput.description !== undefined) updateData.description = sanitizedInput.description

    // Recalculate current amount if category changed
    if (sanitizedInput.category && sanitizedInput.category !== existingGoal.category) {
      updateData.currentAmount = await this.calculateCurrentGoalAmount(
        input.organizationId,
        sanitizedInput.category
      )
    }

    const goal = await prisma.financialGoal.update({
      where: { id: input.id },
      data: updateData,
    })

    // Revalidate goals page
    revalidatePath(`/org/${input.organizationId}/goals`)

    return goal
  }

  /**
   * Delete financial goal
   */
  async deleteGoal(goalId: string, organizationId: string): Promise<{ success: boolean }> {
    await this.validateAuth(organizationId)
    this.validateUUID(goalId, 'Goal ID')

    // Check if goal exists and belongs to organization
    const goal = await prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        organizationId,
      },
    })

    if (!goal) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Delete goal
    await prisma.financialGoal.delete({
      where: { id: goalId },
    })

    // Revalidate goals page
    revalidatePath(`/org/${organizationId}/goals`)

    return { success: true }
  }

  /**
   * Update goal progress (recalculate current amount based on transactions/assets)
   */
  async updateGoalProgress(goalId: string, organizationId: string): Promise<FinancialGoal> {
    await this.validateAuth(organizationId)
    this.validateUUID(goalId, 'Goal ID')

    // Get goal
    const goal = await prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        organizationId,
      },
    })

    if (!goal) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Calculate current amount based on goal category
    const currentAmount = await this.calculateCurrentGoalAmount(organizationId, goal.category || 'asset_growth')

    // Update goal with new current amount
    const updatedGoal = await prisma.financialGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: currentAmount,
        updatedAt: new Date(),
      },
    })

    // Revalidate goals page
    revalidatePath(`/org/${organizationId}/goals`)

    return updatedGoal
  }

  /**
   * Calculate current amount for goal based on category
   */
  private async calculateCurrentGoalAmount(organizationId: string, category: string): Promise<number> {
    switch (category) {
      case 'asset_growth': {
        // Calculate total assets
        const assets = await prisma.asset.findMany({
          where: { organizationId },
        })
        return assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0)
      }
      
      case 'savings': {
        // Calculate savings from transactions (income - expenses)
        const transactions = await prisma.transaction.findMany({
          where: { organizationId },
        })
        let savings = 0
        transactions.forEach(transaction => {
          const amount = Number(transaction.amount)
          if (amount > 0) {
            savings += amount
          } else {
            savings -= Math.abs(amount)
          }
        })
        return Math.max(0, savings)
      }
      
      case 'debt_reduction': {
        // Calculate total debt reduction (original debt - current debt)
        const liabilities = await prisma.liability.findMany({
          where: { organizationId },
        })
        // For debt reduction, we want to track reduction, so return negative of current amount
        const currentDebt = liabilities.reduce((sum, liability) => sum + Number(liability.currentAmount), 0)
        return currentDebt > 0 ? -currentDebt : 0
      }
      
      case 'expense_reduction': {
        // Calculate expense reduction (compare to previous period)
        const currentYear = new Date().getFullYear()
        const currentMonth = new Date().getMonth()
        
        // Get current month expenses
        const currentMonthStart = new Date(currentYear, currentMonth, 1)
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0)
        
        const currentExpenses = await prisma.transaction.findMany({
          where: {
            organizationId,
            transactionDate: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
            amount: {
              lt: 0, // Expenses (negative amounts)
            },
          },
        })
        
        const currentTotal = currentExpenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
        
        // For expense reduction goal, return negative of current expenses to show reduction needed
        return currentTotal > 0 ? -currentTotal : 0
      }
      
      default:
        return 0
    }
  }
}

// Create instance and export wrapped methods
const goalActions = new GoalActions()

// Export server actions with error handling
export const getGoals = createServerAction(
  async (organizationId: string) => goalActions.getGoals(organizationId)
)

export const createGoal = createServerAction(
  async (input: {
    name: string
    category?: string
    targetAmount: number
    targetDate: string
    priority?: string
    description?: string
    organizationId: string
  }) => goalActions.createGoal(input)
)

export const updateGoal = createServerAction(
  async (input: {
    id: string
    name?: string
    category?: string
    targetAmount?: number
    targetDate?: string
    priority?: string
    description?: string
    organizationId: string
  }) => goalActions.updateGoal(input)
)

export const deleteGoal = createServerAction(
  async (goalId: string, organizationId: string) =>
    goalActions.deleteGoal(goalId, organizationId)
)

export const updateGoalProgress = createServerAction(
  async (goalId: string, organizationId: string) =>
    goalActions.updateGoalProgress(goalId, organizationId)
)