'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  getCurrentUser,
  requireAuth,
  requireAdminRole,
  checkOrganizationMembership,
} from '@/lib/auth-server'
import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  ServerActionError,
} from '@/lib/types'
import {
  BaseServerAction,
  createServerAction,
  withDatabaseTransaction,
} from './base'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

interface SettingsData {
  organization: Organization | null
  members: OrganizationMember[]
  userProfile: UserProfile | null
  currentUserRole: string | null
}

interface InvitationData {
  id: string
  email: string
  role: string
  status: string
  createdAt: Date
  expiresAt: Date
  organization: {
    name: string
  }
}

class SettingsActions extends BaseServerAction {
  /**
   * Get comprehensive settings data for organization
   */
  async getSettingsData(organizationId: string): Promise<SettingsData> {
    const user = await requireAuth()
    this.validateUUID(organizationId, 'Organization ID')

    // Check organization membership
    const membership = await checkOrganizationMembership(user.id, organizationId)
    if (!membership) {
      throw new Error(ServerActionError.FORBIDDEN)
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!organization) {
      throw new Error(ServerActionError.NOT_FOUND)
    }

    // Get organization members (admin only)
    let members: OrganizationMember[] = []
    if (membership.role === 'admin' || membership.role === 'owner') {
      members = await prisma.organizationMember.findMany({
        where: { organizationId },
        orderBy: { joinedAt: 'desc' },
      })
    }

    // Create user profile from auth user
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
    }

    return {
      organization,
      members,
      userProfile,
      currentUserRole: membership.role,
    }
  }

  /**
   * Get organization invitations (admin only)
   */
  async getOrganizationInvitations(organizationId: string): Promise<InvitationData[]> {
    const user = await requireAuth()
    this.validateUUID(organizationId, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, organizationId)

    const invitations = await prisma.organizationInvitation.findMany({
      where: { organizationId },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
    }))
  }

  /**
   * Update user profile
   */
  async updateUserProfile(input: {
    full_name?: string
    avatar_url?: string
  }): Promise<{ success: boolean }> {
    const user = await requireAuth()

    // Sanitize input
    const sanitizedInput = this.sanitizeInput(input)

    // Update user metadata via Supabase Auth API
    // Note: This would typically require Supabase Admin API or service role
    // For now, this is a placeholder - in production you'd integrate with Supabase Auth Admin API
    
    console.log('Profile update request:', { userId: user.id, ...sanitizedInput })

    // Revalidate relevant pages
    revalidatePath('/settings')

    return { success: true }
  }

  /**
   * Resend invitation (admin only)
   */
  async resendInvitation(invitationId: string, organizationId: string): Promise<{ success: boolean }> {
    const user = await requireAuth()
    this.validateUUID(invitationId, 'Invitation ID')
    this.validateUUID(organizationId, 'Organization ID')

    // Verify admin role
    await requireAdminRole(user.id, organizationId)

    // Check if invitation exists and is pending
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

    // Update expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: {
        expiresAt,
      },
    })

    // TODO: Send invitation email here
    // await sendInvitationEmail(invitation.email, invitation.token, organization.name)

    // Revalidate settings page
    revalidatePath(`/org/${organizationId}/settings`)

    return { success: true }
  }
}

// Create instance and export wrapped methods
const settingsActions = new SettingsActions()

// Export server actions with error handling
export const getSettingsData = createServerAction(
  async (organizationId: string) => settingsActions.getSettingsData(organizationId)
)

export const getOrganizationInvitations = createServerAction(
  async (organizationId: string) => settingsActions.getOrganizationInvitations(organizationId)
)

export const updateUserProfile = createServerAction(
  async (input: { full_name?: string; avatar_url?: string }) =>
    settingsActions.updateUserProfile(input)
)

export const resendInvitation = createServerAction(
  async (invitationId: string, organizationId: string) =>
    settingsActions.resendInvitation(invitationId, organizationId)
)