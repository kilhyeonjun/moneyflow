'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  validateUserAndOrganization,
  withErrorHandling,
} from '@/lib/auth-server'
import {
  TransactionWithDetails,
  TransactionCreateInput,
  TransactionUpdateInput,
  TransactionFilters,
  ServerActionResult,
  ServerActionError,
  transformTransactionForFrontend,
} from '@/lib/types'
import {
  BaseServerAction,
  normalizePagination,
  createPaginatedResult,
  buildTransactionWhereClause,
  validateAmount,
  validateTransactionType,
  parseDate,
  aggregateTransactions,
  createServerAction,
  PaginationOptions,
  PaginatedResult,
  TransactionAggregation,
} from './base'

class TransactionActions extends BaseServerAction {
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
   * Get transactions with filtering, pagination, and search
   */
  async getTransactions(
    organizationId: string,
    filters?: Partial<TransactionFilters>,
    pagination?: PaginationOptions
  ): Promise<
    PaginatedResult<ReturnType<typeof transformTransactionForFrontend>>
  > {
    const { user } = await this.validateAuth(organizationId)

    const finalFilters: TransactionFilters = {
      organizationId,
      ...filters,
    }

    const where = buildTransactionWhereClause(finalFilters)
    const paginationConfig = normalizePagination(pagination || {})

    // Get total count and transactions in parallel
    const [totalCount, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
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
        orderBy: {
          transactionDate: 'desc',
        },
        take: paginationConfig.take,
        skip: paginationConfig.skip,
      }),
    ])

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      transactions,
      organizationId
    )

    // Transform for frontend compatibility
    const transformedTransactions = enrichedTransactions.map(
      transformTransactionForFrontend
    )

    return await createPaginatedResult(
      transformedTransactions,
      totalCount,
      paginationConfig
    )
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(
    transactionId: string,
    organizationId: string
  ): Promise<ReturnType<typeof transformTransactionForFrontend>> {
    this.validateUUID(transactionId, 'Transaction ID')
    await this.validateAuth(organizationId)

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
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
    })

    if (!transaction) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      [transaction],
      organizationId
    )

    return transformTransactionForFrontend(enrichedTransactions[0])
  }

  /**
   * Create a new transaction
   */
  async createTransaction(
    input: TransactionCreateInput
  ): Promise<ReturnType<typeof transformTransactionForFrontend>> {
    const { user } = await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, [
      'organizationId',
      'amount',
      'description',
      'transactionType',
    ])

    // Validate and sanitize input
    const validatedInput = {
      ...this.sanitizeInput(input),
      amount: validateAmount(input.amount as number),
      transactionType: validateTransactionType(input.transactionType),
      transactionDate: input.transactionDate
        ? parseDate(input.transactionDate)
        : new Date(),
      userId: user.id,
    }

    // Validate payment method belongs to the organization if provided
    if (validatedInput.paymentMethodId) {
      this.validateUUID(validatedInput.paymentMethodId, 'Payment Method ID')

      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          id: validatedInput.paymentMethodId,
          organizationId: input.organizationId,
        },
      })

      if (!paymentMethod) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Payment method not found or does not belong to this organization`
        )
      }
    }

    // Validate category belongs to the organization if provided
    if (validatedInput.categoryId) {
      this.validateUUID(validatedInput.categoryId, 'Category ID')

      const category = await prisma.category.findFirst({
        where: {
          id: validatedInput.categoryId,
          organizationId: input.organizationId,
          isActive: true,
        },
      })

      if (!category) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Category not found or does not belong to this organization`
        )
      }

      // Validate category type matches transaction type
      const transactionType = validatedInput.transactionType
      if (!this.isCategoryTypeCompatible(category.type, transactionType)) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Category type '${category.type}' is not compatible with transaction type '${transactionType}'`
        )
      }
    }

    // Create transaction
    const transactionData: Prisma.TransactionCreateInput = {
      amount: validatedInput.amount,
      description: validatedInput.description || null,
      transactionDate: validatedInput.transactionDate,
      transactionType: validatedInput.transactionType,
      userId: validatedInput.userId,
      organization: {
        connect: { id: input.organizationId },
      },
      ...(validatedInput.paymentMethodId && {
        paymentMethod: {
          connect: { id: validatedInput.paymentMethodId },
        },
      }),
      ...(validatedInput.categoryId && {
        categoryId: validatedInput.categoryId,
      }),
      ...(validatedInput.tags && { tags: validatedInput.tags }),
      ...(validatedInput.memo && { memo: validatedInput.memo }),
      ...(validatedInput.receiptUrl && {
        receiptUrl: validatedInput.receiptUrl,
      }),
    }

    const transaction = await prisma.transaction.create({
      data: transactionData,
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
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      [transaction],
      input.organizationId
    )

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/dashboard`)

    return transformTransactionForFrontend(enrichedTransactions[0])
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    input: TransactionUpdateInput
  ): Promise<ReturnType<typeof transformTransactionForFrontend>> {
    this.validateUUID(input.id, 'Transaction ID')

    if (!input.organizationId) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Organization ID is required`
      )
    }

    const { user } = await this.validateAuth(input.organizationId)

    // Check if transaction exists and belongs to the organization
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingTransaction) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Prepare update data
    const updateData: any = this.sanitizeInput(input)
    delete updateData.id
    delete updateData.organizationId // Can't update organization

    // Validate fields if they're being updated
    if (updateData.amount !== undefined) {
      updateData.amount = validateAmount(updateData.amount as number)
    }

    if (updateData.transactionType !== undefined) {
      updateData.transactionType = validateTransactionType(
        updateData.transactionType
      )
    }

    if (updateData.transactionDate !== undefined) {
      updateData.transactionDate = parseDate(updateData.transactionDate)
    }

    // Validate payment method if being updated
    if (updateData.paymentMethodId !== undefined) {
      if (updateData.paymentMethodId) {
        this.validateUUID(updateData.paymentMethodId, 'Payment Method ID')

        const paymentMethod = await prisma.paymentMethod.findFirst({
          where: {
            id: updateData.paymentMethodId,
            organizationId: input.organizationId,
          },
        })

        if (!paymentMethod) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Payment method not found or does not belong to this organization`
          )
        }
      }
    }

    // Validate category if being updated
    if (updateData.categoryId !== undefined) {
      if (updateData.categoryId) {
        this.validateUUID(updateData.categoryId, 'Category ID')

        const category = await prisma.category.findFirst({
          where: {
            id: updateData.categoryId,
            organizationId: input.organizationId,
            isActive: true,
          },
        })

        if (!category) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Category not found or does not belong to this organization`
          )
        }

        // Validate category type matches transaction type
        const transactionType =
          updateData.transactionType || existingTransaction.transactionType
        if (!this.isCategoryTypeCompatible(category.type, transactionType)) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Category type '${category.type}' is not compatible with transaction type '${transactionType}'`
          )
        }
      }
    }

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: input.id },
      data: updateData,
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
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      [updatedTransaction],
      input.organizationId
    )

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/dashboard`)

    return transformTransactionForFrontend(enrichedTransactions[0])
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(
    transactionId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    this.validateUUID(transactionId, 'Transaction ID')
    await this.validateAuth(organizationId)

    // Check if transaction exists and belongs to the organization
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        organizationId,
      },
    })

    if (!transaction) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Delete the transaction
    await prisma.transaction.delete({
      where: { id: transactionId },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${organizationId}/transactions`)
    revalidatePath(`/org/${organizationId}/dashboard`)

    return { success: true }
  }

  /**
   * Get transaction statistics and aggregations
   */
  async getTransactionStats(
    organizationId: string,
    filters?: Partial<TransactionFilters>
  ): Promise<TransactionAggregation> {
    await this.validateAuth(organizationId)

    const finalFilters: TransactionFilters = {
      organizationId,
      ...filters,
    }

    return await aggregateTransactions(finalFilters)
  }

  /**
   * Get recent transactions (used for dashboard)
   */
  async getRecentTransactions(
    organizationId: string,
    limit: number = 10
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
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 50), // Cap at 50
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      transactions,
      organizationId
    )

    return enrichedTransactions.map(transformTransactionForFrontend)
  }

  /**
   * Get transactions grouped by category with statistics
   */
  async getTransactionsByCategory(
    organizationId: string,
    filters?: Partial<TransactionFilters>
  ): Promise<
    {
      categoryId: string | null
      categoryName: string
      categoryType: string | null
      transactionCount: number
      totalAmount: number
      averageAmount: number
      transactions: ReturnType<typeof transformTransactionForFrontend>[]
    }[]
  > {
    await this.validateAuth(organizationId)

    const finalFilters: TransactionFilters = {
      organizationId,
      ...filters,
    }

    const where = buildTransactionWhereClause(finalFilters)

    // Get transactions grouped by category
    const transactions = await prisma.transaction.findMany({
      where,
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
      orderBy: {
        transactionDate: 'desc',
      },
    })

    // Enrich with category information
    const enrichedTransactions = await this.enrichTransactionsWithCategories(
      transactions,
      organizationId
    )

    // Group by category
    const categoryGroups = new Map<string | null, typeof enrichedTransactions>()

    enrichedTransactions.forEach(transaction => {
      const categoryId = transaction.categoryId
      if (!categoryGroups.has(categoryId)) {
        categoryGroups.set(categoryId, [])
      }
      categoryGroups.get(categoryId)!.push(transaction)
    })

    // Calculate statistics for each category
    const result = Array.from(categoryGroups.entries()).map(
      ([categoryId, categoryTransactions]) => {
        const totalAmount = categoryTransactions.reduce(
          (sum, t) => sum + t.amount.toNumber(),
          0
        )
        const averageAmount = totalAmount / categoryTransactions.length

        const firstTransaction = categoryTransactions[0]
        const categoryName = firstTransaction?.category?.name || 'Uncategorized'
        const categoryType = firstTransaction?.category?.type || null

        return {
          categoryId,
          categoryName,
          categoryType,
          transactionCount: categoryTransactions.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          averageAmount: Math.round(averageAmount * 100) / 100,
          transactions: categoryTransactions.map(
            transformTransactionForFrontend
          ),
        }
      }
    )

    // Sort by total amount (descending)
    return result.sort((a, b) => b.totalAmount - a.totalAmount)
  }

  // Private helper methods

  /**
   * Check if category type is compatible with transaction type
   */
  private isCategoryTypeCompatible(
    categoryType: string,
    transactionType: string
  ): boolean {
    const compatibilityMap: Record<string, string[]> = {
      income: ['income'],
      savings: ['income', 'transfer'], // Savings can accept income or transfers
      fixed_expense: ['expense'],
      variable_expense: ['expense'],
    }

    return compatibilityMap[categoryType]?.includes(transactionType) || false
  }
}

// Create instance and export wrapped methods
const transactionActions = new TransactionActions()

// Export server actions with error handling
export const getTransactions = createServerAction(
  async (
    organizationId: string,
    filters?: Partial<TransactionFilters>,
    pagination?: PaginationOptions
  ) => transactionActions.getTransactions(organizationId, filters, pagination)
)

export const getTransaction = createServerAction(
  async (transactionId: string, organizationId: string) =>
    transactionActions.getTransaction(transactionId, organizationId)
)

export const createTransaction = createServerAction(
  async (input: TransactionCreateInput) =>
    transactionActions.createTransaction(input)
)

export const updateTransaction = createServerAction(
  async (input: TransactionUpdateInput) =>
    transactionActions.updateTransaction(input)
)

export const deleteTransaction = createServerAction(
  async (transactionId: string, organizationId: string) =>
    transactionActions.deleteTransaction(transactionId, organizationId)
)

export const getTransactionStats = createServerAction(
  async (organizationId: string, filters?: Partial<TransactionFilters>) =>
    transactionActions.getTransactionStats(organizationId, filters)
)

export const getRecentTransactions = createServerAction(
  async (organizationId: string, limit?: number) =>
    transactionActions.getRecentTransactions(organizationId, limit)
)

export const getTransactionsByCategory = createServerAction(
  async (organizationId: string, filters?: Partial<TransactionFilters>) =>
    transactionActions.getTransactionsByCategory(organizationId, filters)
)
