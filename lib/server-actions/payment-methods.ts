'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  validateUserAndOrganization,
  withErrorHandling,
} from '@/lib/auth-server'
import {
  PaymentMethodWithUsage,
  PaymentMethodCreateInput,
  PaymentMethodUpdateInput,
  ServerActionResult,
  ServerActionError,
  transformPaymentMethodForFrontend,
} from '@/lib/types'
import {
  BaseServerAction,
  validatePaymentMethodType,
  createServerAction,
} from './base'

class PaymentMethodActions extends BaseServerAction {
  /**
   * Get payment methods for an organization
   */
  async getPaymentMethods(
    organizationId: string
  ): Promise<ReturnType<typeof transformPaymentMethodForFrontend>[]> {
    const { user } = await this.validateAuth(organizationId)

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        organizationId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' }, // Active methods first
        { createdAt: 'asc' },
      ],
    })

    return paymentMethods.map(transformPaymentMethodForFrontend)
  }

  /**
   * Get a single payment method by ID
   */
  async getPaymentMethod(
    paymentMethodId: string,
    organizationId: string
  ): Promise<ReturnType<typeof transformPaymentMethodForFrontend>> {
    this.validateUUID(paymentMethodId, 'Payment Method ID')
    await this.validateAuth(organizationId)

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!paymentMethod) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    return transformPaymentMethodForFrontend(
      paymentMethod as PaymentMethodWithUsage
    )
  }

  /**
   * Create a new payment method
   */
  async createPaymentMethod(
    input: PaymentMethodCreateInput
  ): Promise<ReturnType<typeof transformPaymentMethodForFrontend>> {
    const { user } = await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, ['organizationId', 'name', 'type'])

    // Ensure organizationId is provided
    if (!input.organizationId) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Organization ID is required`
      )
    }

    // Validate and sanitize input
    const validatedInput = {
      ...this.sanitizeInput(input),
      type: validatePaymentMethodType(input.type),
      organizationId: input.organizationId,
    }

    // Validate type-specific fields
    if (validatedInput.type === 'card' && validatedInput.lastFourDigits) {
      if (!/^\d{4}$/.test(validatedInput.lastFourDigits)) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Last four digits must be exactly 4 numbers`
        )
      }
    }

    if (validatedInput.type === 'account' && validatedInput.accountNumber) {
      // Basic account number validation (at least 4 characters)
      if (validatedInput.accountNumber.length < 4) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Account number must be at least 4 characters`
        )
      }
    }

    // Check for duplicate payment method names within the organization
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        organizationId: validatedInput.organizationId,
        name: validatedInput.name,
      },
    })

    if (existingPaymentMethod) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: A payment method with this name already exists`
      )
    }

    // Create payment method
    const paymentMethodData: Prisma.PaymentMethodCreateInput = {
      name: validatedInput.name as string,
      type: validatedInput.type,
      bankName: validatedInput.bankName || null,
      accountNumber: validatedInput.accountNumber || null,
      cardCompany: validatedInput.cardCompany || null,
      lastFourDigits: validatedInput.lastFourDigits || null,
      isActive: true,
      organization: {
        connect: { id: input.organizationId as string },
      },
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: paymentMethodData,
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/settings`)

    return transformPaymentMethodForFrontend(
      paymentMethod as PaymentMethodWithUsage
    )
  }

  /**
   * Update an existing payment method
   */
  async updatePaymentMethod(
    input: PaymentMethodUpdateInput
  ): Promise<ReturnType<typeof transformPaymentMethodForFrontend>> {
    this.validateUUID(input.id, 'Payment Method ID')

    if (!input.organizationId) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Organization ID is required`
      )
    }

    const { user } = await this.validateAuth(input.organizationId)

    // Check if payment method exists and belongs to the organization
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingPaymentMethod) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Prepare update data
    const updateData: any = this.sanitizeInput(input)
    delete updateData.id
    delete updateData.organizationId // Can't update organization

    // Validate fields if they're being updated
    if (updateData.type !== undefined) {
      updateData.type = validatePaymentMethodType(updateData.type)
    }

    if (updateData.lastFourDigits !== undefined && updateData.lastFourDigits) {
      if (!/^\d{4}$/.test(updateData.lastFourDigits)) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Last four digits must be exactly 4 numbers`
        )
      }
    }

    if (updateData.accountNumber !== undefined && updateData.accountNumber) {
      if (updateData.accountNumber.length < 4) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: Account number must be at least 4 characters`
        )
      }
    }

    // Check for duplicate names if name is being updated
    if (updateData.name && updateData.name !== existingPaymentMethod.name) {
      const duplicatePaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          organizationId: input.organizationId,
          name: updateData.name,
          id: { not: input.id },
        },
      })

      if (duplicatePaymentMethod) {
        throw new Error(
          `${ServerActionError.VALIDATION_ERROR}: A payment method with this name already exists`
        )
      }
    }

    // Update payment method
    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: { id: input.id },
      data: updateData,
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${input.organizationId}/transactions`)
    revalidatePath(`/org/${input.organizationId}/settings`)

    return transformPaymentMethodForFrontend(
      updatedPaymentMethod as PaymentMethodWithUsage
    )
  }

  /**
   * Delete a payment method (only if no transactions are associated)
   */
  async deletePaymentMethod(
    paymentMethodId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    this.validateUUID(paymentMethodId, 'Payment Method ID')
    await this.validateAuth(organizationId)

    // Check if payment method exists and belongs to the organization
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!paymentMethod) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Check if payment method has associated transactions
    if (paymentMethod._count.transactions > 0) {
      throw new Error(
        `${ServerActionError.VALIDATION_ERROR}: Cannot delete payment method with associated transactions. Consider deactivating it instead.`
      )
    }

    // Delete the payment method
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${organizationId}/transactions`)
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }

  /**
   * Toggle payment method active status
   */
  async togglePaymentMethodStatus(
    paymentMethodId: string,
    organizationId: string
  ): Promise<ReturnType<typeof transformPaymentMethodForFrontend>> {
    this.validateUUID(paymentMethodId, 'Payment Method ID')
    await this.validateAuth(organizationId)

    // Check if payment method exists and belongs to the organization
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        organizationId,
      },
    })

    if (!paymentMethod) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Toggle the active status
    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: {
        isActive: !paymentMethod.isActive,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    // Revalidate relevant pages
    revalidatePath(`/org/${organizationId}/transactions`)
    revalidatePath(`/org/${organizationId}/settings`)

    return transformPaymentMethodForFrontend(
      updatedPaymentMethod as PaymentMethodWithUsage
    )
  }

  /**
   * Get payment methods summary for dashboard
   */
  async getPaymentMethodsSummary(organizationId: string): Promise<{
    total: number
    active: number
    inactive: number
    byType: Record<string, number>
  }> {
    await this.validateAuth(organizationId)

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { organizationId },
      select: {
        type: true,
        isActive: true,
      },
    })

    const summary = {
      total: paymentMethods.length,
      active: paymentMethods.filter(pm => pm.isActive).length,
      inactive: paymentMethods.filter(pm => !pm.isActive).length,
      byType: {} as Record<string, number>,
    }

    // Count by type
    paymentMethods.forEach(pm => {
      summary.byType[pm.type] = (summary.byType[pm.type] || 0) + 1
    })

    return summary
  }
}

// Create instance and export wrapped methods
const paymentMethodActions = new PaymentMethodActions()

// Export server actions with error handling
export const getPaymentMethods = createServerAction(
  async (organizationId: string) =>
    paymentMethodActions.getPaymentMethods(organizationId)
)

export const getPaymentMethod = createServerAction(
  async (paymentMethodId: string, organizationId: string) =>
    paymentMethodActions.getPaymentMethod(paymentMethodId, organizationId)
)

export const createPaymentMethod = createServerAction(
  async (input: PaymentMethodCreateInput) =>
    paymentMethodActions.createPaymentMethod(input)
)

export const updatePaymentMethod = createServerAction(
  async (input: PaymentMethodUpdateInput) =>
    paymentMethodActions.updatePaymentMethod(input)
)

export const deletePaymentMethod = createServerAction(
  async (paymentMethodId: string, organizationId: string) =>
    paymentMethodActions.deletePaymentMethod(paymentMethodId, organizationId)
)

export const togglePaymentMethodStatus = createServerAction(
  async (paymentMethodId: string, organizationId: string) =>
    paymentMethodActions.togglePaymentMethodStatus(
      paymentMethodId,
      organizationId
    )
)

export const getPaymentMethodsSummary = createServerAction(
  async (organizationId: string) =>
    paymentMethodActions.getPaymentMethodsSummary(organizationId)
)
