import { Prisma } from '@prisma/client'

// Core Prisma types for database models
export type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  Transaction,
  PaymentMethod,
  Category,
} from '@prisma/client'

// Extended types with relations for common use cases

// Transaction with payment method and category details
export type TransactionWithDetails = Prisma.TransactionGetPayload<{
  include: {
    paymentMethod: {
      select: {
        id: true
        name: true
        type: true
      }
    }
    category: {
      select: {
        id: true
        name: true
        type: true
        parent: {
          select: {
            id: true
            name: true
          }
        }
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

// Category with children and parent for hierarchical structure
export type CategoryWithChildren = Prisma.CategoryGetPayload<{
  include: {
    children: {
      select: {
        id: true
        name: true
        type: true
        displayOrder: true
        isActive: true
      }
      orderBy: {
        displayOrder: 'asc'
      }
    }
    parent: {
      select: {
        id: true
        name: true
        type: true
      }
    }
    _count: {
      select: {
        transactions: true
      }
    }
  }
}>

// Category with transaction usage statistics
export type CategoryWithUsage = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        transactions: true
        children: true
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
  transactionType?: string
  categoryId?: string
  categoryType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// Category filter types
export type CategoryFilters = {
  organizationId: string
  type?: string
  parentId?: string | null
  isActive?: boolean
  includeChildren?: boolean
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

// Payment method input types
export type PaymentMethodCreateInput = {
  organizationId: string
  name: string
  type: 'cash' | 'card' | 'account' | 'other'
  bankName?: string
  accountNumber?: string
  cardCompany?: string
  lastFourDigits?: string
}

export type PaymentMethodUpdateInput = PaymentMethodCreateInput & {
  id: string
}

// Category input types
export type CategoryCreateInput = {
  organizationId: string
  name: string
  type: 'income' | 'savings' | 'fixed_expense' | 'variable_expense'
  parentId?: string | null
  displayOrder?: number
}

export type CategoryUpdateInput = CategoryCreateInput & {
  id: string
  isActive?: boolean
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
          type: transaction.category.type,
          parent: transaction.category.parent
            ? {
                id: transaction.category.parent.id,
                name: transaction.category.parent.name,
              }
            : null,
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

// Transform payment method for frontend compatibility
export function transformPaymentMethodForFrontend(
  paymentMethod: PaymentMethodWithUsage
) {
  return {
    id: paymentMethod.id,
    organizationId: paymentMethod.organizationId,
    name: paymentMethod.name,
    type: paymentMethod.type,
    bankName: paymentMethod.bankName,
    accountNumber: paymentMethod.accountNumber,
    cardCompany: paymentMethod.cardCompany,
    lastFourDigits: paymentMethod.lastFourDigits,
    isActive: paymentMethod.isActive,
    createdAt: paymentMethod.createdAt?.toISOString(),
    updatedAt: paymentMethod.updatedAt?.toISOString(),
    transactionCount: paymentMethod._count.transactions,
  }
}

// Transform category for frontend compatibility
export function transformCategoryForFrontend(category: CategoryWithChildren) {
  return {
    id: category.id,
    organizationId: category.organizationId,
    name: category.name,
    type: category.type,
    parentId: category.parentId,
    displayOrder: category.displayOrder,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    parent: category.parent
      ? {
          id: category.parent.id,
          name: category.parent.name,
          type: category.parent.type,
        }
      : null,
    children: category.children.map(child => ({
      id: child.id,
      name: child.name,
      type: child.type,
      displayOrder: child.displayOrder,
      isActive: child.isActive,
    })),
    transactionCount: category._count.transactions,
  }
}

// Build hierarchical category tree
export function buildCategoryTree(
  categories: CategoryWithChildren[]
): CategoryWithChildren[] {
  const categoryMap = new Map<string, CategoryWithChildren>()
  const rootCategories: CategoryWithChildren[] = []

  // Create a map for quick lookup
  categories.forEach(category => {
    categoryMap.set(category.id, category)
  })

  // Build the tree structure
  categories.forEach(category => {
    if (!category.parentId) {
      rootCategories.push(category)
    }
  })

  // Sort root categories by displayOrder
  return rootCategories.sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  )
}

// Get category path (breadcrumb)
export function getCategoryPath(category: CategoryWithChildren): string[] {
  const path: string[] = []
  let current = category

  while (current) {
    path.unshift(current.name)
    current = current.parent as CategoryWithChildren
  }

  return path
}
