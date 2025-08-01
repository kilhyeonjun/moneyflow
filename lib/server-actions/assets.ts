'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { validateUserAndOrganization } from '@/lib/auth-server'
import { ServerActionError } from '@/lib/types'
import {
  BaseServerAction,
  createServerAction,
  withDatabaseTransaction,
} from './base'

// Import Prisma types directly
import type { AssetCategory, Asset, Liability } from '@prisma/client'

// Extended types
interface AssetWithCategory extends Asset {
  category: AssetCategory
}

interface AssetSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

interface AssetData {
  assetCategories: AssetCategory[]
  assets: AssetWithCategory[]
  liabilities: Liability[]
  summary: AssetSummary
}

class AssetActions extends BaseServerAction {
  /**
   * Get comprehensive asset data for organization
   */
  async getAssetData(organizationId: string): Promise<AssetData> {
    await this.validateAuth(organizationId)

    // Get asset categories
    const assetCategories = await prisma.assetCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    })

    // Get assets with categories
    const assets = await prisma.asset.findMany({
      where: { organizationId },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get liabilities
    const liabilities = await prisma.liability.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate summary
    const totalAssets = assets.reduce(
      (sum, asset) => sum + Number(asset.currentValue),
      0
    )
    const totalLiabilities = liabilities.reduce(
      (sum, liability) => sum + Number(liability.currentAmount),
      0
    )
    const netWorth = totalAssets - totalLiabilities

    const summary: AssetSummary = {
      totalAssets,
      totalLiabilities,
      netWorth,
    }

    return {
      assetCategories,
      assets: assets as AssetWithCategory[],
      liabilities,
      summary,
    }
  }

  /**
   * Create default asset categories
   */
  async createDefaultAssetCategories(
    organizationId: string
  ): Promise<{ success: boolean }> {
    await this.validateAuth(organizationId)

    const defaultCategories = [
      { name: '현금 및 예금', type: 'asset' },
      { name: '투자자산', type: 'asset' },
      { name: '부동산', type: 'asset' },
      { name: '기타 자산', type: 'asset' },
      { name: '신용카드', type: 'liability' },
      { name: '대출', type: 'liability' },
      { name: '기타 부채', type: 'liability' },
    ]

    await withDatabaseTransaction(async tx => {
      for (const category of defaultCategories) {
        await tx.assetCategory.create({
          data: {
            name: category.name,
            type: category.type,
            organizationId,
          },
        })
      }
    })

    // Revalidate assets page
    revalidatePath(`/org/${organizationId}/assets`)

    return { success: true }
  }

  /**
   * Create asset
   */
  async createAsset(input: {
    name: string
    description?: string
    type: string
    categoryId: string
    currentValue: number
    targetValue?: number
    organizationId: string
  }): Promise<Asset> {
    await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, [
      'name',
      'type',
      'categoryId',
      'currentValue',
      'organizationId',
    ])

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Validate category exists
    const category = await prisma.assetCategory.findFirst({
      where: {
        id: input.categoryId,
        organizationId: input.organizationId,
      },
    })

    if (!category) {
      throw new Error(
        `${ServerActionError.NOT_FOUND}: Asset category not found`
      )
    }

    const asset = await prisma.asset.create({
      data: {
        name: sanitizedInput.name!,
        description: sanitizedInput.description,
        type: sanitizedInput.type!,
        categoryId: sanitizedInput.categoryId,
        currentValue: Number(sanitizedInput.currentValue),
        targetValue: sanitizedInput.targetValue
          ? Number(sanitizedInput.targetValue)
          : undefined,
        organizationId: sanitizedInput.organizationId!,
      },
    })

    // Revalidate assets page
    revalidatePath(`/org/${input.organizationId}/assets`)

    return asset
  }

  /**
   * Update asset
   */
  async updateAsset(input: {
    id: string
    name?: string
    description?: string
    type?: string
    categoryId?: string
    currentValue?: number
    targetValue?: number
    organizationId: string
  }): Promise<Asset> {
    await this.validateAuth(input.organizationId)
    this.validateUUID(input.id, 'Asset ID')

    // Check if asset exists and belongs to organization
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingAsset) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Validate category if provided
    if (input.categoryId) {
      const category = await prisma.assetCategory.findFirst({
        where: {
          id: input.categoryId,
          organizationId: input.organizationId,
        },
      })

      if (!category) {
        throw new Error(
          `${ServerActionError.NOT_FOUND}: Asset category not found`
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (sanitizedInput.name !== undefined) updateData.name = sanitizedInput.name
    if (sanitizedInput.description !== undefined)
      updateData.description = sanitizedInput.description
    if (sanitizedInput.type !== undefined) updateData.type = sanitizedInput.type
    if (sanitizedInput.categoryId !== undefined)
      updateData.categoryId = sanitizedInput.categoryId
    if (sanitizedInput.currentValue !== undefined)
      updateData.currentValue = Number(sanitizedInput.currentValue)
    if (sanitizedInput.targetValue !== undefined)
      updateData.targetValue = sanitizedInput.targetValue
        ? Number(sanitizedInput.targetValue)
        : undefined

    const asset = await prisma.asset.update({
      where: { id: input.id },
      data: updateData,
    })

    // Revalidate assets page
    revalidatePath(`/org/${input.organizationId}/assets`)

    return asset
  }

  /**
   * Delete asset
   */
  async deleteAsset(
    assetId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    await this.validateAuth(organizationId)
    this.validateUUID(assetId, 'Asset ID')

    // Check if asset exists and belongs to organization
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        organizationId,
      },
    })

    if (!asset) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Delete asset
    await prisma.asset.delete({
      where: { id: assetId },
    })

    // Revalidate assets page
    revalidatePath(`/org/${organizationId}/assets`)

    return { success: true }
  }

  /**
   * Create liability
   */
  async createLiability(input: {
    name: string
    description?: string
    type: string
    currentAmount: number
    organizationId: string
  }): Promise<Liability> {
    await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, [
      'name',
      'type',
      'currentAmount',
      'organizationId',
    ])

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    const liability = await prisma.liability.create({
      data: {
        name: sanitizedInput.name!,
        description: sanitizedInput.description,
        type: sanitizedInput.type!,
        currentAmount: Number(sanitizedInput.currentAmount),
        organizationId: sanitizedInput.organizationId!,
      },
    })

    // Revalidate assets page
    revalidatePath(`/org/${input.organizationId}/assets`)

    return liability
  }

  /**
   * Update liability
   */
  async updateLiability(input: {
    id: string
    name?: string
    description?: string
    type?: string
    currentAmount?: number
    organizationId: string
  }): Promise<Liability> {
    await this.validateAuth(input.organizationId)
    this.validateUUID(input.id, 'Liability ID')

    // Check if liability exists and belongs to organization
    const existingLiability = await prisma.liability.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingLiability) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Prepare update data
    const updateData: any = {}
    if (sanitizedInput.name !== undefined) updateData.name = sanitizedInput.name
    if (sanitizedInput.description !== undefined)
      updateData.description = sanitizedInput.description || null
    if (sanitizedInput.type !== undefined) updateData.type = sanitizedInput.type
    if (sanitizedInput.currentAmount !== undefined)
      updateData.currentAmount = Number(sanitizedInput.currentAmount)

    const liability = await prisma.liability.update({
      where: { id: input.id },
      data: updateData,
    })

    // Revalidate assets page
    revalidatePath(`/org/${input.organizationId}/assets`)

    return liability
  }

  /**
   * Delete liability
   */
  async deleteLiability(
    liabilityId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    await this.validateAuth(organizationId)
    this.validateUUID(liabilityId, 'Liability ID')

    // Check if liability exists and belongs to organization
    const liability = await prisma.liability.findFirst({
      where: {
        id: liabilityId,
        organizationId,
      },
    })

    if (!liability) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Delete liability
    await prisma.liability.delete({
      where: { id: liabilityId },
    })

    // Revalidate assets page
    revalidatePath(`/org/${organizationId}/assets`)

    return { success: true }
  }
}

// Create instance and export wrapped methods
const assetActions = new AssetActions()

// Export server actions with error handling
export const getAssetData = createServerAction(async (organizationId: string) =>
  assetActions.getAssetData(organizationId)
)

export const createDefaultAssetCategories = createServerAction(
  async (organizationId: string) =>
    assetActions.createDefaultAssetCategories(organizationId)
)

export const createAsset = createServerAction(
  async (input: {
    name: string
    description?: string
    type: string
    categoryId: string
    currentValue: number
    targetValue?: number
    organizationId: string
  }) => assetActions.createAsset(input)
)

export const updateAsset = createServerAction(
  async (input: {
    id: string
    name?: string
    description?: string
    type?: string
    categoryId?: string
    currentValue?: number
    targetValue?: number
    organizationId: string
  }) => assetActions.updateAsset(input)
)

export const deleteAsset = createServerAction(
  async (assetId: string, organizationId: string) =>
    assetActions.deleteAsset(assetId, organizationId)
)

export const createLiability = createServerAction(
  async (input: {
    name: string
    description?: string
    type: string
    currentAmount: number
    organizationId: string
  }) => assetActions.createLiability(input)
)

export const updateLiability = createServerAction(
  async (input: {
    id: string
    name?: string
    description?: string
    type?: string
    currentAmount?: number
    organizationId: string
  }) => assetActions.updateLiability(input)
)

export const deleteLiability = createServerAction(
  async (liabilityId: string, organizationId: string) =>
    assetActions.deleteLiability(liabilityId, organizationId)
)
