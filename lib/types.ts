import { Prisma } from '@prisma/client'

// Core Prisma types for database models
export type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  Transaction,
  Category,
  PaymentMethod,
  Asset,
  AssetCategory,
  Debt,
  Liability,
  DefaultCategory,
  DefaultAssetCategory,
} from '@prisma/client'

// Extended types with relations for common use cases

// Transaction with category and payment method details
export type TransactionWithDetails = Prisma.TransactionGetPayload<{
  include: {
    category: {
      select: {
        id: true
        name: true
        transactionType: true
        icon: true
        color: true
      }
    }
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

// Category with parent and children relationships
export type CategoryWithHierarchy = Prisma.CategoryGetPayload<{
  include: {
    parent: {
      select: {
        id: true
        name: true
        level: true
      }
    }
    children: {
      select: {
        id: true
        name: true
        level: true
        transactionType: true
        icon: true
        color: true
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
        categories: true
        assets: true
        debts: true
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
    categories: number
    assets: number
    debts: number
    members: number
  }
}

// Asset with category details
export type AssetWithCategory = Prisma.AssetGetPayload<{
  include: {
    category: {
      select: {
        id: true
        name: true
        type: true
        icon: true
        color: true
      }
    }
  }
}>

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
  categoryId?: string
  transactionType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export type CategoryFilters = {
  organizationId: string
  transactionType?: string
  level?: number
  parentId?: string
}

// Input types for forms (excluding auto-generated fields)
export type TransactionCreateInput = Omit<
  Prisma.TransactionCreateInput,
  | 'id'
  | 'userId'
  | 'organization'
  | 'category'
  | 'paymentMethod'
  | 'createdAt'
  | 'updatedAt'
> & {
  organizationId: string
  categoryId?: string
  paymentMethodId?: string
}

export type TransactionUpdateInput = Partial<TransactionCreateInput> & {
  id: string
}

export type CategoryCreateInput = Omit<
  Prisma.CategoryCreateInput,
  | 'id'
  | 'organization'
  | 'parent'
  | 'children'
  | 'transactions'
  | 'createdAt'
  | 'updatedAt'
> & {
  organizationId: string
  parentId?: string
}

export type CategoryUpdateInput = Partial<CategoryCreateInput> & {
  id: string
}

export type AssetCreateInput = Omit<
  Prisma.AssetCreateInput,
  'id' | 'organization' | 'category' | 'createdAt' | 'updatedAt'
> & {
  organizationId: string
  categoryId?: string
}

export type AssetUpdateInput = Partial<AssetCreateInput> & {
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

export function isCategoryWithHierarchy(
  category: any
): category is CategoryWithHierarchy {
  return (
    category &&
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.level === 'number'
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
    categoryId: transaction.categoryId,
    paymentMethodId: transaction.paymentMethodId,
    tags: transaction.tags,
    memo: transaction.memo,
    receiptUrl: transaction.receiptUrl,
    createdAt: transaction.createdAt?.toISOString(),
    updatedAt: transaction.updatedAt?.toISOString(),
    category: transaction.category
      ? {
          id: transaction.category.id,
          name: transaction.category.name,
          transactionType: transaction.category.transactionType,
          icon: transaction.category.icon,
          color: transaction.category.color,
        }
      : null,
    paymentMethod: transaction.paymentMethod
      ? {
          id: transaction.paymentMethod.id,
          name: transaction.paymentMethod.name,
          type: transaction.paymentMethod.type,
        }
      : null,
  }
}
