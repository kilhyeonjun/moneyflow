import { Prisma } from '@prisma/client'

// Core Prisma types for database models
export type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  Transaction,
  PaymentMethod,
} from '@prisma/client'

// Extended types with relations for common use cases

// Transaction with payment method details
export type TransactionWithDetails = Prisma.TransactionGetPayload<{
  include: {
    paymentMethod: {
      select: {
        id: true
        name: true
        type: true
      }
    }
    organization: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

// Organization with member count and basic stats
export type OrganizationWithStats = Prisma.OrganizationGetPayload<{
  include: {
    members: {
      select: {
        id: true
        userId: true
        role: true
        joinedAt: true
      }
    }
    _count: {
      select: {
        transactions: true
      }
    }
  }
}>

// User's organization view (from getUserOrganizations)
export type UserOrganization = {
  id: string
  name: string
  description: string | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
  membershipRole: string
  joinedAt: Date | null
  stats: {
    transactions: number
    members: number
  }
}

// Payment method with transaction count
export type PaymentMethodWithUsage = Prisma.PaymentMethodGetPayload<{
  include: {
    _count: {
      select: {
        transactions: true
      }
    }
  }
}>

// Common filter types for queries
export type TransactionFilters = {
  organizationId: string
  transactionType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// Input types for forms (excluding auto-generated fields)
export type TransactionCreateInput = Omit<
  Prisma.TransactionCreateInput,
  | 'id'
  | 'userId'
  | 'organization'
  | 'paymentMethod'
  | 'createdAt'
  | 'updatedAt'
> & {
  organizationId: string
  paymentMethodId?: string
}

export type TransactionUpdateInput = Partial<TransactionCreateInput> & {
  id: string
}


// Response types for server actions
export type ServerActionResult<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Common error types
export enum ServerActionError {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Utility type helpers
export type NonNullable<T> = T extends null | undefined ? never : T

// Type guard utilities
export function isTransactionWithDetails(
  transaction: any
): transaction is TransactionWithDetails {
  return (
    transaction &&
    typeof transaction.id === 'string' &&
    typeof transaction.amount === 'object' &&
    typeof transaction.organizationId === 'string'
  )
}


// Type-safe field transformers for frontend compatibility
export function transformTransactionForFrontend(
  transaction: TransactionWithDetails
) {
  return {
    id: transaction.id,
    organizationId: transaction.organizationId,
    userId: transaction.userId,
    amount: transaction.amount.toNumber(),
    description: transaction.description,
    transactionDate: transaction.transactionDate.toISOString(),
    transactionType: transaction.transactionType,
    paymentMethodId: transaction.paymentMethodId,
    tags: transaction.tags,
    memo: transaction.memo,
    receiptUrl: transaction.receiptUrl,
    createdAt: transaction.createdAt?.toISOString(),
    updatedAt: transaction.updatedAt?.toISOString(),
    paymentMethod: transaction.paymentMethod
      ? {
          id: transaction.paymentMethod.id,
          name: transaction.paymentMethod.name,
          type: transaction.paymentMethod.type,
        }
      : null,
  }
}
