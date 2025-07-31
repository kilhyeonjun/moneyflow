import { prisma } from '@/lib/prisma'
import {
  validateUserAndOrganization,
  withErrorHandling,
  createSuccessResponse,
  createErrorResponse,
  validateRequiredFields,
  sanitizeInput,
  isValidUUID,
} from '@/lib/auth-server'
import {
  ServerActionResult,
  ServerActionError,
  TransactionFilters,
  CategoryFilters,
} from '@/lib/types'
import { Prisma } from '@prisma/client'

/**
 * Base class for server actions with common functionality
 */
export abstract class BaseServerAction {
  protected async validateAuth(organizationId: string) {
    return await validateUserAndOrganization(organizationId)
  }

  protected validateUUID(id: string, fieldName: string = 'ID'): void {
    if (!isValidUUID(id)) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid ${fieldName} format`)
    }
  }

  protected validateRequiredFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): void {
    validateRequiredFields(data, fields)
  }

  protected sanitizeInput<T extends Record<string, any>>(data: T): Partial<T> {
    return sanitizeInput(data)
  }
}

/**
 * Common pagination utilities
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function normalizePagination(options: PaginationOptions) {
  const limit = options.limit || options.pageSize || 20
  const offset = options.offset || ((options.page || 1) - 1) * limit
  const page = options.page || Math.floor(offset / limit) + 1

  return {
    take: Math.min(limit, 100), // Cap at 100 items
    skip: Math.max(offset, 0),
    page: Math.max(page, 1),
    pageSize: limit,
  }
}

export async function createPaginatedResult<T>(
  data: T[],
  totalCount: number,
  pagination: ReturnType<typeof normalizePagination>
): Promise<PaginatedResult<T>> {
  const totalPages = Math.ceil(totalCount / pagination.pageSize)
  
  return {
    data,
    pagination: {
      total: totalCount,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  }
}

/**
 * Common filter utilities
 */
export function buildTransactionWhereClause(
  filters: TransactionFilters
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    organizationId: filters.organizationId,
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters.transactionType) {
    where.transactionType = filters.transactionType
  }

  if (filters.startDate || filters.endDate) {
    where.transactionDate = {}
    if (filters.startDate) {
      where.transactionDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.transactionDate.lte = filters.endDate
    }
  }

  return where
}

export function buildCategoryWhereClause(
  filters: CategoryFilters
): Prisma.CategoryWhereInput {
  const where: Prisma.CategoryWhereInput = {
    organizationId: filters.organizationId,
  }

  if (filters.transactionType) {
    where.transactionType = filters.transactionType
  }

  if (filters.level !== undefined) {
    where.level = filters.level
  }

  if (filters.parentId !== undefined) {
    where.parentId = filters.parentId
  }

  return where
}

/**
 * Common date utilities for server actions
 */
export function parseDate(dateString: string | Date): Date {
  if (dateString instanceof Date) {
    return dateString
  }
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid date format`)
  }
  
  return date
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'year' | 'custom', customStart?: Date, customEnd?: Date) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'today':
      return {
        startDate: startOfDay,
        endDate: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1),
      }
    
    case 'week':
      const startOfWeek = new Date(startOfDay)
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
      return {
        startDate: startOfWeek,
        endDate: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
      }
    
    case 'month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      }
    
    case 'year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
      }
    
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error(`${ServerActionError.VALIDATION_ERROR}: Custom date range requires start and end dates`)
      }
      return {
        startDate: customStart,
        endDate: customEnd,
      }
    
    default:
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid date period`)
  }
}

/**
 * Common data validation utilities
 */
export function validateAmount(amount: number | string): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid amount`)
  }
  
  // Round to 2 decimal places for currency
  return Math.round(numAmount * 100) / 100
}

export function validateTransactionType(type: string): string {
  const validTypes = ['income', 'expense', 'transfer']
  if (!validTypes.includes(type)) {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid transaction type`)
  }
  return type
}

export function validatePriority(priority: string): string {
  const validPriorities = ['low', 'medium', 'high']
  if (!validPriorities.includes(priority)) {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid priority`)
  }
  return priority
}

export function validateStatus(status: string): string {
  const validStatuses = ['active', 'completed', 'paused', 'cancelled']
  if (!validStatuses.includes(status)) {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid status`)
  }
  return status
}

/**
 * Database transaction wrapper for complex operations
 */
export async function withDatabaseTransaction<T>(
  operation: (prisma: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operation)
}

/**
 * Common aggregation utilities
 */
export interface TransactionAggregation {
  totalIncome: number
  totalExpense: number
  netAmount: number
  transactionCount: number
  averageAmount: number
}

export async function aggregateTransactions(
  filters: TransactionFilters
): Promise<TransactionAggregation> {
  const where = buildTransactionWhereClause(filters)

  const [incomeAgg, expenseAgg, totalCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, transactionType: 'income' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { ...where, transactionType: 'expense' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.count({ where }),
  ])

  const totalIncome = incomeAgg._sum.amount?.toNumber() || 0
  const totalExpense = expenseAgg._sum.amount?.toNumber() || 0
  const netAmount = totalIncome - totalExpense
  const averageAmount = totalCount > 0 ? (totalIncome + totalExpense) / totalCount : 0

  return {
    totalIncome,
    totalExpense,
    netAmount,
    transactionCount: totalCount,
    averageAmount: Math.round(averageAmount * 100) / 100,
  }
}

/**
 * Error handling utilities specific to database operations
 */
export function handlePrismaError(error: any): never {
  console.error('Prisma error:', error)

  if (error.code === 'P2002') {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: 중복된 데이터가 있습니다.`)
  }

  if (error.code === 'P2003') {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: 참조된 데이터가 존재하지 않습니다.`)
  }

  if (error.code === 'P2025') {
    throw new Error(`${ServerActionError.NOT_FOUND}: 요청한 데이터를 찾을 수 없습니다.`)
  }

  if (error.code === 'P2016') {
    throw new Error(`${ServerActionError.VALIDATION_ERROR}: 쿼리 해석 오류가 발생했습니다.`)
  }

  throw new Error(ServerActionError.DATABASE_ERROR)
}

/**
 * Reusable server action wrapper with standardized error handling
 */
export function createServerAction<TArgs extends any[], TResult>(
  action: (...args: TArgs) => Promise<TResult>
) {
  return async (...args: TArgs): Promise<ServerActionResult<TResult>> => {
    return withErrorHandling(async () => {
      try {
        return await action(...args)
      } catch (error: any) {
        if (error.code && error.code.startsWith('P')) {
          handlePrismaError(error)
        }
        throw error
      }
    })
  }
}