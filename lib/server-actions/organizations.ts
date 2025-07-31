'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  getCurrentUser,
  requireAuth,
  checkOrganizationMembership,
  requireAdminRole,
  getUserOrganizations as getUserOrganizationsFromAuth,
  getOrganizationDetails as getOrganizationDetailsFromAuth,
} from '@/lib/auth-server'
import {
  Organization,
  OrganizationWithStats,
  UserOrganization,
  OrganizationMember,
  OrganizationInvitation,
  ServerActionError,
} from '@/lib/types'
import {
  BaseServerAction,
  createServerAction,
  withDatabaseTransaction,
} from './base'

class OrganizationActions extends BaseServerAction {
  /**
   * Get user's organizations
   */
  async getUserOrganizations(): Promise<UserOrganization[]> {
    const user = await requireAuth()
    return await getUserOrganizationsFromAuth(user.id)
  }

  /**
   * Get organization details (admin only)
   */
  async getOrganizationDetails(organizationId: string) {
    const user = await requireAuth()
    const details = await getOrganizationDetailsFromAuth(user.id, organizationId)
    
    if (!details) {
      throw new Error(ServerActionError.NOT_FOUND)
    }
    
    return details
  }

  /**
   * Create a new organization
   */
  async createOrganization(input: {
    name: string
    description?: string
  }): Promise<Organization> {
    const user = await requireAuth()

    // Validate required fields
    this.validateRequiredFields(input, ['name'])

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Create organization with the user as admin in a transaction
    const organization = await withDatabaseTransaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: input.name,
          description: input.description || null,
          createdBy: user.id,
        },
      })

      // Add creator as admin member
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'admin',
        },
      })

      return org
    })

    // Revalidate organizations page
    revalidatePath('/organizations')

    return organization
  }

  /**
   * Update organization details (admin only)
   */
  async updateOrganization(input: {
    id: string
    name?: string
    description?: string
  }): Promise<Organization> {
    const user = await requireAuth()
    this.validateUUID(input.id, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, input.id)

    // Prepare update data
    const updateData = this.sanitizeInput(input)
    delete updateData.id

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: input.id },
      data: updateData,
    })

    // Revalidate relevant pages
    revalidatePath('/organizations')
    revalidatePath(`/org/${input.id}/settings`)

    return organization
  }

  /**
   * Delete organization (admin only)
   */
  async deleteOrganization(organizationId: string): Promise<{ success: boolean }> {
    const user = await requireAuth()
    this.validateUUID(organizationId, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, organizationId)

    // Check if organization has any data that would prevent deletion
    const counts = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        _count: {
          select: {
            transactions: true,
            assets: true,
            debts: true,
            financialGoals: true,
          },
        },
      },
    })

    if (!counts) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    const hasData = counts._count.transactions > 0 || 
                   counts._count.assets > 0 || 
                   counts._count.debts > 0 || 
                   counts._count.financialGoals > 0

    if (hasData) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Cannot delete organization with existing data. Delete all transactions, assets, debts, and goals first.`)
    }

    // Delete organization (cascading deletes will handle related data)
    await prisma.organization.delete({
      where: { id: organizationId },
    })

    // Revalidate organizations page
    revalidatePath('/organizations')

    return { success: true }
  }

  /**
   * Get organization members (admin only)
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const user = await requireAuth()
    this.validateUUID(organizationId, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, organizationId)

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: {
        joinedAt: 'desc',
      },
    })

    return members
  }

  /**
   * Update member role (admin only)
   */
  async updateMemberRole(input: {
    organizationId: string
    userId: string
    role: string
  }): Promise<OrganizationMember> {
    const user = await requireAuth()
    this.validateUUID(input.organizationId, 'Organization ID')
    this.validateUUID(input.userId, 'User ID')

    // Verify admin role
    await requireAdminRole(user.id, input.organizationId)

    // Validate role
    const validRoles = ['admin', 'member']
    if (!validRoles.includes(input.role)) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid role`)
    }

    // Prevent self-demotion if user is the only admin
    if (input.userId === user.id && input.role !== 'admin') {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId: input.organizationId,
          role: 'admin',
        },
      })

      if (adminCount <= 1) {
        throw new Error(`${ServerActionError.VALIDATION_ERROR}: Cannot remove admin role - organization must have at least one admin`)
      }
    }

    // Check if member exists
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
    })

    if (!existingMember) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Update member role
    const updatedMember = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      data: {
        role: input.role,
      },
    })

    // Revalidate settings page
    revalidatePath(`/org/${input.organizationId}/settings`)

    return updatedMember
  }

  /**
   * Remove member from organization (admin only)
   */
  async removeMember(organizationId: string, userId: string): Promise<{ success: boolean }> {
    const user = await requireAuth()
    this.validateUUID(organizationId, 'Organization ID')
    this.validateUUID(userId, 'User ID')

    // Verify admin role
    await requireAdminRole(user.id, organizationId)

    // Prevent self-removal if user is the only admin
    if (userId === user.id) {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: 'admin',
        },
      })

      if (adminCount <= 1) {
        throw new Error(`${ServerActionError.VALIDATION_ERROR}: Cannot remove the only admin from organization`)
      }
    }

    // Check if member exists
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    })

    if (!member) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Remove member
    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    })

    // Revalidate settings page
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }

  /**
   * Create organization invitation (admin only)
   */
  async createInvitation(input: {
    organizationId: string
    email: string
    role?: string
  }): Promise<OrganizationInvitation> {
    const user = await requireAuth()
    this.validateUUID(input.organizationId, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, ['organizationId', 'email'])

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.email)) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid email format`)
    }

    // Validate role
    const role = input.role || 'member'
    const validRoles = ['admin', 'member']
    if (!validRoles.includes(role)) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invalid role`)
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: input.organizationId,
        // Note: We can't directly check by email since we store userId
        // This would require a separate user lookup, but for now we'll check by invitation
      },
    })

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: input.organizationId,
        email: input.email,
        status: 'pending',
      },
    })

    if (existingInvitation) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: Invitation already sent to this email`)
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: input.organizationId,
        email: input.email,
        role,
        token,
        expiresAt,
      },
    })

    // TODO: Send invitation email here
    // await sendInvitationEmail(invitation.email, invitation.token, organization.name)

    // Revalidate settings page
    revalidatePath(`/org/${input.organizationId}/settings`)

    return invitation
  }

  /**
   * Cancel invitation (admin only)
   */
  async cancelInvitation(invitationId: string, organizationId: string): Promise<{ success: boolean }> {
    const user = await requireAuth()
    this.validateUUID(invitationId, 'Invitation ID')
    this.validateUUID(organizationId, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, organizationId)

    // Check if invitation exists and belongs to the organization
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
        status: 'pending',
      },
    })

    if (!invitation) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Cancel invitation
    await prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'cancelled',
      },
    })

    // Revalidate settings page
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }

  /**
   * Accept invitation (public - accessed via invitation token)
   */
  async acceptInvitation(token: string): Promise<{ success: boolean; organizationId: string }> {
    const user = await requireAuth()

    // Find invitation by token
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      throw new Error(`${ServerActionError.NOT_FOUND}: Invitation not found or expired`)
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      throw new Error(`${ServerActionError.VALIDATION_ERROR}: You are already a member of this organization`)
    }

    // Accept invitation in a transaction
    await withDatabaseTransaction(async (tx) => {
      // Create membership
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      })

      // Update invitation status
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: user.id,
        },
      })
    })

    // Revalidate organizations page
    revalidatePath('/organizations')

    return {
      success: true,
      organizationId: invitation.organizationId,
    }
  }

  /**
   * Get invitation details by token (public)
   */
  async getInvitationByToken(token: string): Promise<{
    id: string
    email: string
    role: string
    organizationName: string
    expiresAt: Date
    isExpired: boolean
  }> {
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        status: 'pending',
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    const isExpired = invitation.expiresAt < new Date()

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      expiresAt: invitation.expiresAt,
      isExpired,
    }
  }

  /**
   * Check if user is member of organization
   */
  async checkMembership(organizationId: string): Promise<{
    isMember: boolean
    role?: string
    member?: OrganizationMember
  }> {
    const user = await getCurrentUser()
    
    if (!user) {
      return { isMember: false }
    }

    this.validateUUID(organizationId, 'Organization ID')

    const member = await checkOrganizationMembership(user.id, organizationId)

    return {
      isMember: !!member,
      role: member?.role,
      member: member || undefined,
    }
  }
}

// Create instance and export wrapped methods
const organizationActions = new OrganizationActions()

// Export server actions with error handling
export const getUserOrganizations = createServerAction(
  async () => organizationActions.getUserOrganizations()
)

export const getOrganizationDetails = createServerAction(
  async (organizationId: string) => organizationActions.getOrganizationDetails(organizationId)
)

export const createOrganization = createServerAction(
  async (input: { name: string; description?: string }) =>
    organizationActions.createOrganization(input)
)

export const updateOrganization = createServerAction(
  async (input: { id: string; name?: string; description?: string }) =>
    organizationActions.updateOrganization(input)
)

export const deleteOrganization = createServerAction(
  async (organizationId: string) => organizationActions.deleteOrganization(organizationId)
)

export const getOrganizationMembers = createServerAction(
  async (organizationId: string) => organizationActions.getOrganizationMembers(organizationId)
)

export const updateMemberRole = createServerAction(
  async (input: { organizationId: string; userId: string; role: string }) =>
    organizationActions.updateMemberRole(input)
)

export const removeMember = createServerAction(
  async (organizationId: string, userId: string) =>
    organizationActions.removeMember(organizationId, userId)
)

export const createInvitation = createServerAction(
  async (input: { organizationId: string; email: string; role?: string }) =>
    organizationActions.createInvitation(input)
)

export const cancelInvitation = createServerAction(
  async (invitationId: string, organizationId: string) =>
    organizationActions.cancelInvitation(invitationId, organizationId)
)

export const acceptInvitation = createServerAction(
  async (token: string) => organizationActions.acceptInvitation(token)
)

export const getInvitationByToken = createServerAction(
  async (token: string) => organizationActions.getInvitationByToken(token)
)

export const checkMembership = createServerAction(
  async (organizationId: string) => organizationActions.checkMembership(organizationId)
)