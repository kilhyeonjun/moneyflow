'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { validateUserAndOrganization } from '@/lib/auth-server'
import {
  Category,
  CategoryWithHierarchy,
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryFilters,
  ServerActionError,
} from '@/lib/types'
import {
  BaseServerAction,
  buildCategoryWhereClause,
  validateTransactionType,
  createServerAction,
  withDatabaseTransaction,
} from './base'

class CategoryActions extends BaseServerAction {
  /**
   * Get categories with hierarchy and filtering
   */
  async getCategories(
    organizationId: string,
    filters?: Partial<CategoryFilters>
  ): Promise<CategoryWithHierarchy[]> {
    await this.validateAuth(organizationId)

    const finalFilters: CategoryFilters = {
      organizationId,
      ...filters,
    }

    const where = buildCategoryWhereClause(finalFilters)

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            transactionType: true,
            icon: true,
            color: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    return categories
  }

  /**
   * Get hierarchical category tree (for displays that need tree structure)
   */
  async getCategoryTree(
    organizationId: string,
    transactionType?: string
  ): Promise<CategoryWithHierarchy[]> {
    await this.validateAuth(organizationId)

    const where: any = {
      organizationId,
      level: 0, // Root categories only
    }

    if (transactionType) {
      where.transactionType = transactionType
    }

    const rootCategories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            icon: true,
            color: true,
          },
        },
        children: {
          include: {
            children: {
              include: {
                children: true, // Support up to 3 levels deep
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return rootCategories
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
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            transactionType: true,
            icon: true,
            color: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    })

    if (!category) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    return category
  }

  /**
   * Create a new category
   */
  async createCategory(
    input: CategoryCreateInput
  ): Promise<CategoryWithHierarchy> {
    await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, [
      'organizationId',
      'name',
      'transactionType',
    ])

    // Validate transaction type
    const validatedTransactionType = validateTransactionType(
      input.transactionType
    )

    let parentCategory = null
    let level = 0

    // If parentId is provided, validate it
    if (input.parentId) {
      this.validateUUID(input.parentId, 'Parent Category ID')

      parentCategory = await prisma.category.findFirst({
        where: {
          id: input.parentId,
          organizationId: input.organizationId,
        },
      })

      if (!parentCategory) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Parent category not found`
        )
      }

      // Validate that parent and child have the same transaction type
      if (parentCategory.transactionType !== validatedTransactionType) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Child category must have the same transaction type as parent`
        )
      }

      // Calculate level (max 3 levels: 0, 1, 2)
      level = parentCategory.level + 1
      if (level > 2) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Maximum category depth (3 levels) exceeded`
        )
      }
    }

    // Check for duplicate names at the same level with the same parent
    const existingCategory = await prisma.category.findFirst({
      where: {
        organizationId: input.organizationId,
        name: input.name,
        parentId: input.parentId || null,
        level,
      },
    })

    if (existingCategory) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Category with this name already exists at this level`
      )
    }

    // Create category
    const categoryData: Prisma.CategoryCreateInput = {
      name: input.name!,
      transactionType: validatedTransactionType,
      level,
      organization: {
        connect: { id: input.organizationId },
      },
      ...(input.parentId && {
        parent: {
          connect: { id: input.parentId },
        },
      }),
      ...(input.icon && { icon: input.icon }),
      ...(input.color && { color: input.color }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    }

    const category = await prisma.category.create({
      data: categoryData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            transactionType: true,
            icon: true,
            color: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/settings`)

    return category
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

    await this.validateAuth(input.organizationId)

    // Check if category exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
      include: {
        children: true,
        transactions: {
          select: { id: true },
          take: 1, // Just check if any exist
        },
      },
    })

    if (!existingCategory) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Prepare update data
    const updateData = this.sanitizeInput(input)
    delete updateData.id
    delete updateData.organizationId

    // Validate transaction type if being updated
    if (updateData.transactionType) {
      updateData.transactionType = validateTransactionType(
        updateData.transactionType
      )

      // Check if category has children or transactions - if so, transaction type cannot be changed
      if (existingCategory.children.length > 0) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Cannot change transaction type of category with child categories`
        )
      }

      if (existingCategory.transactions.length > 0) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Cannot change transaction type of category with existing transactions`
        )
      }
    }

    // Handle parent change if provided
    if (updateData.parentId !== undefined) {
      if (updateData.parentId) {
        this.validateUUID(updateData.parentId, 'Parent Category ID')

        // Prevent circular references
        if (updateData.parentId === input.id) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Category cannot be its own parent`
          )
        }

        // Check if the new parent would create a circular reference
        const isCircular = await this.checkCircularReference(
          input.id,
          updateData.parentId
        )
        if (isCircular) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: This would create a circular reference`
          )
        }

        const newParent = await prisma.category.findFirst({
          where: {
            id: updateData.parentId,
            organizationId: input.organizationId,
          },
        })

        if (!newParent) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Parent category not found`
          )
        }

        // Validate transaction types match
        const finalTransactionType =
          updateData.transactionType || existingCategory.transactionType
        if (newParent.transactionType !== finalTransactionType) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Parent and child categories must have the same transaction type`
          )
        }

        // Calculate new level
        const newLevel = newParent.level + 1
        if (newLevel > 2) {
          throw new Error(
            `${ServerActionError.VALIDATION_ERROR}: Maximum category depth (3 levels) exceeded`
          )
        }

        updateData.level = newLevel
      } else {
        // Moving to root level
        updateData.level = 0
      }
    }

    // Check for name conflicts if name is being updated
    if (updateData.name) {
      const finalParentId =
        updateData.parentId !== undefined
          ? updateData.parentId
          : existingCategory.parentId
      const finalLevel =
        updateData.level !== undefined
          ? updateData.level
          : existingCategory.level

      const conflictingCategory = await prisma.category.findFirst({
        where: {
          organizationId: input.organizationId,
          name: updateData.name,
          parentId: finalParentId,
          level: finalLevel,
          id: { not: input.id }, // Exclude current category
        },
      })

      if (conflictingCategory) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Category with this name already exists at this level`
        )
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: input.id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            transactionType: true,
            icon: true,
            color: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/settings`)

    return updatedCategory
  }

  /**
   * Delete a category
   */
  async deleteCategory(
    categoryId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    this.validateUUID(categoryId, 'Category ID')
    await this.validateAuth(organizationId)

    // Check if category exists
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId,
      },
      include: {
        children: {
          select: { id: true },
        },
        transactions: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!category) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Cannot delete category with child categories. Delete children first.`
      )
    }

    // Check if category has transactions
    if (category.transactions.length > 0) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Cannot delete category with existing transactions. Move or delete transactions first.`
      )
    }

    // Delete the category
    await prisma.category.delete({
      where: { id: categoryId },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${organizationId}/transactions`)
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }

  /**
   * Bulk create default categories for an organization
   */
  async createDefaultCategories(organizationId: string): Promise<Category[]> {
    await this.validateAuth(organizationId)

    // Get default categories from the database
    const defaultCategories = await prisma.defaultCategory.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    if (defaultCategories.length === 0) {
      throw new Error(
        `${ServerActionError.NOT_FOUND}: No default categories found`
      )
    }

    // Create categories in a transaction to ensure consistency
    const createdCategories = await withDatabaseTransaction(async tx => {
      const categoryMap = new Map<string, string>() // Maps default category name to created category ID
      const results: Category[] = []

      // First pass: create root categories (level 0)
      for (const defaultCategory of defaultCategories.filter(
        c => c.level === 0
      )) {
        const category = await tx.category.create({
          data: {
            organizationId,
            name: defaultCategory.name,
            level: defaultCategory.level,
            transactionType: defaultCategory.transactionType,
            icon: defaultCategory.icon,
            color: defaultCategory.color,
            parentId: null,
          },
        })
        categoryMap.set(defaultCategory.name, category.id)
        results.push(category)
      }

      // Second pass: create level 1 categories
      for (const defaultCategory of defaultCategories.filter(
        c => c.level === 1
      )) {
        const parentId = defaultCategory.parentName
          ? categoryMap.get(defaultCategory.parentName)
          : null
        if (defaultCategory.parentName && !parentId) {
          console.warn(
            `Parent category '${defaultCategory.parentName}' not found for '${defaultCategory.name}'`
          )
          continue
        }

        const category = await tx.category.create({
          data: {
            organizationId,
            name: defaultCategory.name,
            level: defaultCategory.level,
            transactionType: defaultCategory.transactionType,
            icon: defaultCategory.icon,
            color: defaultCategory.color,
            parentId,
          },
        })
        categoryMap.set(defaultCategory.name, category.id)
        results.push(category)
      }

      // Third pass: create level 2 categories
      for (const defaultCategory of defaultCategories.filter(
        c => c.level === 2
      )) {
        const parentId = defaultCategory.parentName
          ? categoryMap.get(defaultCategory.parentName)
          : null
        if (defaultCategory.parentName && !parentId) {
          console.warn(
            `Parent category '${defaultCategory.parentName}' not found for '${defaultCategory.name}'`
          )
          continue
        }

        const category = await tx.category.create({
          data: {
            organizationId,
            name: defaultCategory.name,
            level: defaultCategory.level,
            transactionType: defaultCategory.transactionType,
            icon: defaultCategory.icon,
            color: defaultCategory.color,
            parentId,
          },
        })
        categoryMap.set(defaultCategory.name, category.id)
        results.push(category)
      }

      return results
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${organizationId}/transactions`)
    revalidatePath(`/org/${organizationId}/settings`)

    return createdCategories
  }

  /**
   * Check for circular references when changing parent
   */
  private async checkCircularReference(
    categoryId: string,
    potentialParentId: string
  ): Promise<boolean> {
    let currentId: string | null = potentialParentId

    while (currentId) {
      if (currentId === categoryId) {
        return true // Circular reference found
      }

      const parent: { parentId: string | null } | null =
        await prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        })

      currentId = parent?.parentId || null
    }

    return false
  }
}

// Create instance and export wrapped methods
const categoryActions = new CategoryActions()

// Export server actions with error handling
export const getCategories = createServerAction(
  async (organizationId: string, filters?: Partial<CategoryFilters>) =>
    categoryActions.getCategories(organizationId, filters)
)

export const getCategoryTree = createServerAction(
  async (organizationId: string, transactionType?: string) =>
    categoryActions.getCategoryTree(organizationId, transactionType)
)

export const getCategory = createServerAction(
  async (categoryId: string, organizationId: string) =>
    categoryActions.getCategory(categoryId, organizationId)
)

export const createCategory = createServerAction(
  async (input: CategoryCreateInput) => categoryActions.createCategory(input)
)

export const updateCategory = createServerAction(
  async (input: CategoryUpdateInput) => categoryActions.updateCategory(input)
)

export const deleteCategory = createServerAction(
  async (categoryId: string, organizationId: string) =>
    categoryActions.deleteCategory(categoryId, organizationId)
)

export const createDefaultCategories = createServerAction(
  async (organizationId: string) =>
    categoryActions.createDefaultCategories(organizationId)
)
