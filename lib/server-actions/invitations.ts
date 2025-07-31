'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { validateUserAndOrganization } from '@/lib/auth-server'
import {
  ServerActionError,
} from '@/lib/types'
import {
  BaseServerAction,
  createServerAction,
} from './base'

// Import Prisma types directly
import type { OrganizationInvitation, OrganizationMember } from '@prisma/client'

// Extended types for organization data
interface OrganizationData {
  members: OrganizationMember[]
  invitations: OrganizationInvitation[]
}

class InvitationActions extends BaseServerAction {
  /**
   * Get organization members and invitations
   */
  async getOrganizationData(organizationId: string): Promise<OrganizationData> {
    await this.validateAuth(organizationId)

    // Get organization members
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { joinedAt: 'asc' },
    })

    // Get pending invitations
    const invitations = await prisma.organizationInvitation.findMany({
      where: { 
        organizationId,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      members,
      invitations,
    }
  }

  /**
   * Create organization invitation
   */
  async createInvitation(input: {
    organizationId: string
    email: string
    role: string
  }): Promise<OrganizationInvitation> {
    await this.validateAuth(input.organizationId)

    // Validate required fields
    this.validateRequiredFields(input, ['organizationId', 'email', 'role'])

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedInput.email!)) {
      throw new Error('올바른 이메일 형식을 입력해주세요')
    }

    // Check if email is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: sanitizedInput.email!,
      },
    })

    if (existingMember) {
      throw new Error('이미 조직의 멤버입니다')
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: input.organizationId,
        email: sanitizedInput.email!,
        status: 'pending',
      },
    })

    if (existingInvitation) {
      throw new Error('이미 초대가 발송되었습니다')
    }

    // Generate invitation token
    const token = this.generateInvitationToken()

    // Set expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: sanitizedInput.organizationId!,
        email: sanitizedInput.email!,
        role: sanitizedInput.role || 'member',
        token,
        status: 'pending',
        expiresAt,
      },
    })

    // Revalidate organization pages
    revalidatePath(`/org/${input.organizationId}/settings`)

    return invitation
  }

  /**
   * Cancel organization invitation
   */
  async cancelInvitation(invitationId: string, organizationId: string): Promise<{ success: boolean }> {
    await this.validateAuth(organizationId)
    this.validateUUID(invitationId, 'Invitation ID')

    // Check if invitation exists and belongs to organization
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
    })

    if (!invitation) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Update invitation status to cancelled
    await prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'cancelled',
      },
    })

    // Revalidate organization pages
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }

  /**
   * Accept invitation (used by the invited user)
   */
  async acceptInvitation(input: {
    token: string
    userId: string
  }): Promise<{ success: boolean; organizationId: string }> {
    // Validate required fields
    this.validateRequiredFields(input, ['token', 'userId'])

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Find invitation by token
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token: sanitizedInput.token!,
        status: 'pending',
      },
    })

    if (!invitation) {
      throw new Error('유효하지 않거나 만료된 초대입니다')
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      throw new Error('만료된 초대입니다')
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: sanitizedInput.userId!,
      },
    })

    if (existingMember) {
      throw new Error('이미 조직의 멤버입니다')
    }

    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Create organization member
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: sanitizedInput.userId!,
          role: invitation.role,
        },
      })

      // Update invitation status to accepted
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: sanitizedInput.userId!,
        },
      })
    })

    // Revalidate organization pages
    revalidatePath(`/org/${invitation.organizationId}/settings`)

    return { success: true, organizationId: invitation.organizationId }
  }

  /**
   * Remove organization member
   */
  async removeMember(memberId: string, organizationId: string): Promise<{ success: boolean }> {
    await this.validateAuth(organizationId)
    this.validateUUID(memberId, 'Member ID')

    // Check if member exists and belongs to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    })

    if (!member) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Prevent removing the owner
    if (member.role === 'owner') {
      throw new Error('소유자는 제거할 수 없습니다')
    }

    // Remove member
    await prisma.organizationMember.delete({
      where: { id: memberId },
    })

    // Revalidate organization pages
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }

  /**
   * Generate secure invitation token
   */
  private generateInvitationToken(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }
}

// Create instance and export wrapped methods
const invitationActions = new InvitationActions()

// Export server actions with error handling
export const getOrganizationData = createServerAction(
  async (organizationId: string) => invitationActions.getOrganizationData(organizationId)
)

export const createInvitation = createServerAction(
  async (input: {
    organizationId: string
    email: string
    role: string
  }) => invitationActions.createInvitation(input)
)

export const cancelInvitation = createServerAction(
  async (invitationId: string, organizationId: string) =>
    invitationActions.cancelInvitation(invitationId, organizationId)
)

export const acceptInvitation = createServerAction(
  async (input: {
    token: string
    userId: string
  }) => invitationActions.acceptInvitation(input)
)

export const removeMember = createServerAction(
  async (memberId: string, organizationId: string) =>
    invitationActions.removeMember(memberId, organizationId)
)