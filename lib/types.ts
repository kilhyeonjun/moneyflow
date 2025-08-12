// Type definitions for MoneyFlow application
// Updated for relationMode = "prisma" (no foreign key constraints)

import { Prisma } from '@prisma/client'
import type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  Transaction,
  PaymentMethod,
  Category,
} from '@prisma/client'

// Export Prisma types for use in other files
export type { Organization, OrganizationMember, OrganizationInvitation } from '@prisma/client'

// Extended types with relations for common use cases

// Base category type without relations (for relationMode = "prisma")
export type CategoryBase = {
  id: string
  organizationId: string
  name: string
  type: string
  parentId: string | null
  displayOrder: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Category with manually constructed hierarchy information
export type CategoryWithHierarchy = CategoryBase & {
  parent?: CategoryBase | null
  children: CategoryBase[]
  transactionCount: number
}

// Legacy type alias for backward compatibility
export type CategoryWithChildren = CategoryWithHierarchy

// Category with usage statistics (manual count)
export type CategoryWithUsage = CategoryBase & {
  transactionCount: number
  childrenCount: number
}

// Transaction with payment method details (no category relation due to relationMode = "prisma")
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
}> & {
  // Manually added category information (populated by application logic)
  category?: {
    id: string
    name: string
    type: string
    parent?: {
      id: string
      name: string
      type: string
    } | null
  } | null
}

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
  type: string
  description?: string
  bankName?: string
  accountNumber?: string
  cardCompany?: string
  lastFourDigits?: string
}

export type PaymentMethodUpdateInput = Partial<PaymentMethodCreateInput> & {
  id: string
}

// Category input types
export type CategoryCreateInput = {
  organizationId: string
  name: string
  type: string
  parentId?: string
  displayOrder?: number
}

export type CategoryUpdateInput = Partial<CategoryCreateInput> & {
  id: string
}

// Organization input types
export type OrganizationCreateInput = {
  name: string
  description?: string
}

export type OrganizationUpdateInput = Partial<OrganizationCreateInput> & {
  id: string
}

// Form validation types
export type FormFieldError = string | null
export type FormErrors<T> = Record<keyof T, FormFieldError>

// API response types
export type ServerActionResult<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Error types
export enum ServerActionError {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
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
    categoryId: transaction.categoryId,
    paymentMethodId: transaction.paymentMethodId,
    transactionType: transaction.transactionType,
    amount: transaction.amount.toNumber(),
    description: transaction.description,
    transactionDate: transaction.transactionDate?.toISOString() || null,
    receiptUrl: transaction.receiptUrl,
    createdAt: transaction.createdAt?.toISOString() || null,
    updatedAt: transaction.updatedAt?.toISOString() || null,
    paymentMethod: transaction.paymentMethod,
    category: transaction.category,
    organization: transaction.organization,
  }
}

// Payment method transformer for frontend compatibility
export function transformPaymentMethodForFrontend(paymentMethod: PaymentMethodWithUsage) {
  return {
    id: paymentMethod.id,
    organizationId: paymentMethod.organizationId,
    name: paymentMethod.name,
    type: paymentMethod.type,
    bankName: paymentMethod.bankName,
    accountNumber: paymentMethod.accountNumber,
    cardCompany: paymentMethod.cardCompany,
    lastFourDigits: paymentMethod.lastFourDigits,
    isActive: paymentMethod.isActive ?? true,
    createdAt: paymentMethod.createdAt?.toISOString() || null,
    updatedAt: paymentMethod.updatedAt?.toISOString() || null,
    transactionCount: paymentMethod._count?.transactions || 0,
  }
}

// Helper function to get category path (breadcrumb)
export function getCategoryPath(category: CategoryWithChildren): string[] {
  const path: string[] = []
  let current = category

  while (current) {
    path.unshift(current.name)
    current = current.parent as CategoryWithChildren
  }

  return path
}

// Helper function to build category hierarchy from flat array
export function buildCategoryHierarchy(categories: CategoryBase[]): CategoryWithHierarchy[] {
  const categoryMap = new Map<string, CategoryWithHierarchy>()
  
  // Initialize all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, {
      ...cat,
      parent: null,
      children: [],
      transactionCount: 0 // Will be populated separately
    })
  })
  
  // Build parent-child relationships
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!
    
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId)
      if (parent) {
        category.parent = parent
        parent.children.push(category)
      }
    }
  })
  
  return Array.from(categoryMap.values())
}