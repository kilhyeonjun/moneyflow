'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  validateUserAndOrganization,
  withErrorHandling,
} from '@/lib/auth-server'
import {
  CategoryBase,
  CategoryWithHierarchy,
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryFilters,
  ServerActionResult,
  ServerActionError,
  buildCategoryHierarchy,
} from '@/lib/types'
import {
  BaseServerAction,
  normalizePagination,
  createPaginatedResult,
  createServerAction,
  PaginationOptions,
  PaginatedResult,
  handlePrismaError,
} from './base'

class CategoriesActions extends BaseServerAction {
  /**
   * Get categories with filtering, hierarchy, and search
   */
  async getCategories(
    organizationId: string,
    filters?: Partial<CategoryFilters>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<CategoryWithHierarchy>> {
    const { user } = await this.validateAuth(organizationId)

    const finalFilters: CategoryFilters = {
      organizationId,
      isActive: true, // Default to active categories only
      ...filters,
    }

    const where = this.buildCategoryWhereClause(finalFilters)
    const paginationConfig = normalizePagination(pagination || {})

    // Get total count and categories in parallel
    const [totalCount, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        take: paginationConfig.take,
        skip: paginationConfig.skip,
      }),
    ])

    // Build hierarchy and get transaction counts
    const categoriesWithHierarchy = await this.buildCategoriesWithHierarchy(
      categories,
      organizationId
    )

    return await createPaginatedResult(
      categoriesWithHierarchy,
      totalCount,
      paginationConfig
    )
  }

  /**
   * Get categories by transaction type (income, expense, etc.)
   */
  async getCategoriesByType(
    organizationId: string,
    type: string,
    includeChildren: boolean = true
  ): Promise<CategoryWithHierarchy[]> {
    await this.validateAuth(organizationId)

    this.validateCategoryType(type)

    const categories = await prisma.category.findMany({
      where: {
        organizationId,
        type,
        isActive: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })

    if (includeChildren) {
      return await this.buildCategoriesWithHierarchy(categories, organizationId)
    } else {
      // Return flat list without hierarchy for performance
      const transactionCounts = await this.getTransactionCounts(
        categories.map(c => c.id)
      )
      return categories.map(cat => ({
        ...cat,
        parent: null,
        children: [],
        transactionCount: transactionCounts.get(cat.id) || 0,
      }))
    }
  }

  /**
   * Get all categories for an organization (optimized for category selects)
   */
  async getAllCategories(
    organizationId: string,
    includeChildren: boolean = true,
    lightweight: boolean = false
  ): Promise<CategoryWithHierarchy[]> {
    await this.validateAuth(organizationId)

    const categories = await prisma.category.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })

    if (includeChildren) {
      return await this.buildCategoriesWithHierarchy(
        categories,
        organizationId,
        !lightweight
      )
    } else {
      // Return flat list without hierarchy for performance
      const transactionCounts = lightweight
        ? new Map()
        : await this.getTransactionCounts(categories.map(c => c.id))
      return categories.map(cat => ({
        ...cat,
        parent: null,
        children: [],
        transactionCount: transactionCounts.get(cat.id) || 0,
      }))
    }
  }

  /**
   * Get a single category by ID
   */
  async getCategory(
    categoryId: string,
    organizationId: string
  ): Promise<CategoryWithHierarchy> {
    this.validateUUID(categoryId, 'Category ID')
    await this.validateAuth(organizationId)

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId,
      },
    })

    if (!category) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Get all categories to build hierarchy
    const allCategories = await prisma.category.findMany({
      where: { organizationId },
    })

    const categoriesWithHierarchy = await this.buildCategoriesWithHierarchy(
      allCategories,
      organizationId
    )
    const result = categoriesWithHierarchy.find(cat => cat.id === categoryId)

    if (!result) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    return result
  }

  /**
   * Create a new category
   */
  async createCategory(
    input: CategoryCreateInput
  ): Promise<CategoryWithHierarchy> {
    const { user } = await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, ['organizationId', 'name', 'type'])

    // Validate and sanitize input
    const validatedInput = {
      ...this.sanitizeInput(input),
      type: this.validateCategoryType(input.type) as
        | 'income'
        | 'savings'
        | 'fixed_expense'
        | 'variable_expense',
      displayOrder: input.displayOrder ?? 0,
    }

    // Validate parent category if provided
    if (validatedInput.parentId) {
      this.validateUUID(validatedInput.parentId, 'Parent Category ID')

      const parentCategory = await prisma.category.findFirst({
        where: {
          id: validatedInput.parentId,
          organizationId: input.organizationId,
          isActive: true,
        },
      })

      if (!parentCategory) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Parent category not found or does not belong to this organization`
        )
      }

      // Ensure parent and child have compatible types
      if (!this.areTypesCompatible(parentCategory.type, validatedInput.type)) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Category type '${validatedInput.type}' is not compatible with parent type '${parentCategory.type}'`
        )
      }

      // Check for circular reference (prevent self-referencing or circular dependencies)
      await this.checkCircularReference(
        validatedInput.parentId,
        input.organizationId
      )
    }

    // Check for duplicate names within the same parent/level
    const existingCategory = await prisma.category.findFirst({
      where: {
        organizationId: input.organizationId,
        name: validatedInput.name,
        parentId: validatedInput.parentId || null,
        type: validatedInput.type,
      },
    })

    if (existingCategory) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Category with this name already exists at this level`
      )
    }

    // Create category
    const categoryData: Prisma.CategoryCreateInput = {
      name: validatedInput.name || input.name,
      type: validatedInput.type,
      displayOrder: validatedInput.displayOrder,
      organization: {
        connect: { id: input.organizationId },
      },
      ...(validatedInput.parentId && {
        parent: {
          connect: { id: validatedInput.parentId },
        },
      }),
    }

    const category = await prisma.category.create({
      data: categoryData,
    })

    // Get the created category with hierarchy
    const allCategories = await prisma.category.findMany({
      where: { organizationId: input.organizationId },
    })

    const categoriesWithHierarchy = await this.buildCategoriesWithHierarchy(
      allCategories,
      input.organizationId
    )
    const result = categoriesWithHierarchy.find(cat => cat.id === category.id)!

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/dashboard`)
    revalidatePath(`/org/${input.organizationId}/settings`)

    return result
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    input: CategoryUpdateInput
  ): Promise<CategoryWithHierarchy> {
    this.validateUUID(input.id, 'Category ID')

    if (!input.organizationId) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Organization ID is required`
      )
    }

    const { user } = await this.validateAuth(input.organizationId)

    // Check if category exists and belongs to the organization
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    // Get children count separately
    const childrenCount = await prisma.category.count({
      where: {
        parentId: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingCategory) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Prepare update data
    const updateData: any = this.sanitizeInput(input)
    delete updateData.id
    delete updateData.organizationId // Can't update organization

    // Validate type if being updated
    if (updateData.type !== undefined) {
      updateData.type = this.validateCategoryType(updateData.type)

      // If changing type, ensure it's compatible with existing children
      if (childrenCount > 0) {
        const children = await prisma.category.findMany({
          where: {
            parentId: input.id,
            organizationId: input.organizationId,
          },
          select: { type: true },
        })

        const incompatibleChildren = children.filter(
          child => !this.areTypesCompatible(updateData.type, child.type)
        )

        if (incompatibleChildren.length > 0) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Cannot change type as it would make existing child categories incompatible`
          )
        }
      }
    }

    // Validate parent if being updated
    if (updateData.parentId !== undefined) {
      if (updateData.parentId) {
        this.validateUUID(updateData.parentId, 'Parent Category ID')

        // Can't set parent to self
        if (updateData.parentId === input.id) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Category cannot be its own parent`
          )
        }

        const parentCategory = await prisma.category.findFirst({
          where: {
            id: updateData.parentId,
            organizationId: input.organizationId,
            isActive: true,
          },
        })

        if (!parentCategory) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Parent category not found or does not belong to this organization`
          )
        }

        // Ensure types are compatible
        const typeToCheck = updateData.type || existingCategory.type
        if (!this.areTypesCompatible(parentCategory.type, typeToCheck)) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Category type is not compatible with parent type`
          )
        }

        // Check for circular reference
        await this.checkCircularReference(
          updateData.parentId,
          input.organizationId,
          input.id
        )
      }
    }

    // Check for duplicate names if name is being updated
    if (
      updateData.name !== undefined &&
      updateData.name !== existingCategory.name
    ) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          organizationId: input.organizationId,
          name: updateData.name,
          parentId:
            updateData.parentId !== undefined
              ? updateData.parentId
              : existingCategory.parentId,
          type:
            updateData.type !== undefined
              ? updateData.type
              : existingCategory.type,
          id: { not: input.id },
        },
      })

      if (duplicateCategory) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Category with this name already exists at this level`
        )
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: input.id },
      data: updateData,
    })

    // Get the updated category with hierarchy
    const allCategories = await prisma.category.findMany({
      where: { organizationId: input.organizationId },
    })

    const categoriesWithHierarchy = await this.buildCategoriesWithHierarchy(
      allCategories,
      input.organizationId
    )
    const result = categoriesWithHierarchy.find(cat => cat.id === input.id)!

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/dashboard`)
    revalidatePath(`/org/${input.organizationId}/settings`)

    return result
  }

  /**
   * Delete a category (soft delete by setting isActive to false)
   * Or hard delete if no transactions are associated
   */
  async deleteCategory(
    categoryId: string,
    organizationId: string,
    forceDelete: boolean = false
  ): Promise<{ success: boolean; deletedPermanently: boolean }> {
    this.validateUUID(categoryId, 'Category ID')
    await this.validateAuth(organizationId)

    // Check if category exists and belongs to the organization
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId,
      },
    })

    if (!category) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Get children and transaction counts separately
    const [childrenCount, transactionCount] = await Promise.all([
      prisma.category.count({
        where: {
          parentId: categoryId,
          organizationId,
        },
      }),
      prisma.transaction.count({
        where: {
          categoryId,
          organizationId,
        },
      }),
    ])

    // Check if category has children
    if (childrenCount > 0) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Cannot delete category with child categories. Please delete or move child categories first.`
      )
    }

    // Check if category has transactions
    const hasTransactions = transactionCount > 0

    if (hasTransactions && !forceDelete) {
      // Soft delete - set isActive to false
      await prisma.category.update({
        where: { id: categoryId },
        data: { isActive: false },
      })

      // Revalidate relevant pages
      revalidatePath(`/org/${organizationId}/transactions`)
      revalidatePath(`/org/${organizationId}/dashboard`)
      revalidatePath(`/org/${organizationId}/settings`)

      return { success: true, deletedPermanently: false }
    } else {
      // Hard delete - category has no transactions or force delete is requested
      if (forceDelete && hasTransactions) {
        // If force delete and has transactions, first remove category reference from transactions
        await prisma.transaction.updateMany({
          where: { categoryId },
          data: { categoryId: null },
        })
      }

      await prisma.category.delete({
        where: { id: categoryId },
      })

      // Revalidate relevant pages
      revalidatePath(`/org/${organizationId}/transactions`)
      revalidatePath(`/org/${organizationId}/dashboard`)
      revalidatePath(`/org/${organizationId}/settings`)

      return { success: true, deletedPermanently: true }
    }
  }

  /**
   * Get hierarchical category tree structure
   */
  async getCategoryTree(
    organizationId: string,
    type?: string,
    includeInactive: boolean = false
  ): Promise<CategoryWithHierarchy[]> {
    await this.validateAuth(organizationId)

    const where: Prisma.CategoryWhereInput = {
      organizationId,
      ...(type && { type: this.validateCategoryType(type) }),
      ...(!includeInactive && { isActive: true }),
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })

    const categoriesWithHierarchy = await this.buildCategoriesWithHierarchy(
      categories,
      organizationId
    )

    // Return only root categories (no parentId) as they contain their children
    return categoriesWithHierarchy.filter(cat => !cat.parentId)
  }

  /**
   * Get categories with usage statistics (transaction counts)
   */
  async getCategoriesWithUsage(
    organizationId: string,
    type?: string,
    includeInactive: boolean = false
  ): Promise<CategoryWithHierarchy[]> {
    await this.validateAuth(organizationId)

    const where: Prisma.CategoryWhereInput = {
      organizationId,
      ...(type && { type: this.validateCategoryType(type) }),
      ...(!includeInactive && { isActive: true }),
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })

    return await this.buildCategoriesWithHierarchy(
      categories,
      organizationId,
      true
    )
  }

  /**
   * Get category statistics with transaction counts and amounts
   */
  async getCategoryStats(
    organizationId: string,
    type?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    {
      categoryId: string
      categoryName: string
      transactionCount: number
      totalAmount: number
      averageAmount: number
    }[]
  > {
    await this.validateAuth(organizationId)

    const where: Prisma.TransactionWhereInput = {
      organizationId,
      categoryId: { not: null },
      ...(startDate && { transactionDate: { gte: startDate } }),
      ...(endDate && { transactionDate: { lte: endDate } }),
      // Note: type filtering handled at application level due to relationMode = "prisma"
    }

    const stats = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    })

    // Get category names
    const categoryIds = stats
      .map(stat => stat.categoryId)
      .filter((id): id is string => id !== null)

    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        organizationId,
        ...(type && { type: this.validateCategoryType(type) }),
      },
      select: {
        id: true,
        name: true,
      },
    })

    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]))

    // Filter stats to only include categories that match the type filter
    const filteredStats = type
      ? stats.filter(
          stat => stat.categoryId && categoryMap.has(stat.categoryId)
        )
      : stats

    return filteredStats.map(stat => ({
      categoryId: stat.categoryId!,
      categoryName: categoryMap.get(stat.categoryId!) || 'Unknown',
      transactionCount: stat._count.id,
      totalAmount: stat._sum.amount?.toNumber() || 0,
      averageAmount: stat._avg.amount?.toNumber() || 0,
    }))
  }

  // Private helper methods

  /**
   * Build categories with hierarchy and transaction counts
   */
  private async buildCategoriesWithHierarchy(
    categories: CategoryBase[],
    organizationId: string,
    includeTransactionCounts: boolean = true
  ): Promise<CategoryWithHierarchy[]> {
    // Get transaction counts if needed
    const transactionCounts = includeTransactionCounts
      ? await this.getTransactionCounts(categories.map(c => c.id))
      : new Map()

    // Build hierarchy using the utility function
    const categoriesWithHierarchy = buildCategoryHierarchy(categories)

    // Add transaction counts
    categoriesWithHierarchy.forEach(cat => {
      cat.transactionCount = transactionCounts.get(cat.id) || 0
    })

    return categoriesWithHierarchy
  }

  /**
   * Get transaction counts for multiple categories
   */
  private async getTransactionCounts(
    categoryIds: string[]
  ): Promise<Map<string, number>> {
    if (categoryIds.length === 0) {
      return new Map()
    }

    const counts = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: { in: categoryIds },
      },
      _count: {
        id: true,
      },
    })

    const countMap = new Map<string, number>()
    counts.forEach(count => {
      if (count.categoryId) {
        countMap.set(count.categoryId, count._count.id)
      }
    })

    return countMap
  }

  private buildCategoryWhereClause(
    filters: CategoryFilters
  ): Prisma.CategoryWhereInput {
    const where: Prisma.CategoryWhereInput = {
      organizationId: filters.organizationId,
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    return where
  }

  private validateCategoryType(type: string): string {
    const validTypes = [
      'income',
      'savings',
      'fixed_expense',
      'variable_expense',
    ]
    if (!validTypes.includes(type)) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Invalid category type. Must be one of: ${validTypes.join(', ')}`
      )
    }
    return type
  }

  private areTypesCompatible(parentType: string, childType: string): boolean {
    // Define compatibility rules - you can customize these based on your business logic
    const compatibilityMap: Record<string, string[]> = {
      income: ['income'], // Income categories can only have income children
      savings: ['savings'], // Savings categories can only have savings children
      fixed_expense: ['fixed_expense'], // Fixed expenses can only have fixed expense children
      variable_expense: ['variable_expense'], // Variable expenses can only have variable expense children
    }

    return compatibilityMap[parentType]?.includes(childType) || false
  }

  private async checkCircularReference(
    parentId: string,
    organizationId: string,
    excludeId?: string
  ): Promise<void> {
    const visited = new Set<string>()
    let currentId = parentId

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Circular reference detected in category hierarchy`
        )
      }

      if (excludeId && currentId === excludeId) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Circular reference detected in category hierarchy`
        )
      }

      visited.add(currentId)

      const parent = await prisma.category.findFirst({
        where: {
          id: currentId,
          organizationId,
        },
        select: {
          parentId: true,
        },
      })

      currentId = parent?.parentId || ''
    }
  }
}

// Create instance and export wrapped methods
const categoriesActions = new CategoriesActions()

// Export server actions with error handling
export const getCategories = createServerAction(
  async (
    organizationId: string,
    filters?: Partial<CategoryFilters>,
    pagination?: PaginationOptions
  ) => categoriesActions.getCategories(organizationId, filters, pagination)
)

export const getCategoriesByType = createServerAction(
  async (organizationId: string, type: string, includeChildren?: boolean) =>
    categoriesActions.getCategoriesByType(organizationId, type, includeChildren)
)

export const getAllCategories = createServerAction(
  async (
    organizationId: string,
    includeChildren?: boolean,
    lightweight?: boolean
  ) =>
    categoriesActions.getAllCategories(
      organizationId,
      includeChildren,
      lightweight
    )
)

export const getCategory = createServerAction(
  async (categoryId: string, organizationId: string) =>
    categoriesActions.getCategory(categoryId, organizationId)
)

export const createCategory = createServerAction(
  async (input: CategoryCreateInput) => categoriesActions.createCategory(input)
)

export const updateCategory = createServerAction(
  async (input: CategoryUpdateInput) => categoriesActions.updateCategory(input)
)

export const deleteCategory = createServerAction(
  async (categoryId: string, organizationId: string, forceDelete?: boolean) =>
    categoriesActions.deleteCategory(categoryId, organizationId, forceDelete)
)

export const getCategoryTree = createServerAction(
  async (organizationId: string, type?: string, includeInactive?: boolean) =>
    categoriesActions.getCategoryTree(organizationId, type, includeInactive)
)

export const getCategoriesWithUsage = createServerAction(
  async (organizationId: string, type?: string, includeInactive?: boolean) =>
    categoriesActions.getCategoriesWithUsage(
      organizationId,
      type,
      includeInactive
    )
)

export const getCategoryStats = createServerAction(
  async (
    organizationId: string,
    type?: string,
    startDate?: Date,
    endDate?: Date
  ) =>
    categoriesActions.getCategoryStats(organizationId, type, startDate, endDate)
)
