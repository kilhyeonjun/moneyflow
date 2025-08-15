import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ServerActionResult, ServerActionError } from '@/lib/types'
import type { Organization, OrganizationMember, Prisma } from '@prisma/client'

// Type for organization member with organization details
type OrganizationMemberWithOrganization = Prisma.OrganizationMemberGetPayload<{
  include: {
    organization: {
      select: {
        id: true
        name: true
        description: true
      }
    }
  }
}>

/**
 * Get current authenticated user from Supabase session
 * This should be used in server actions to verify authentication
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Error getting current user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Validate user authentication and redirect if not authenticated
 * Use this in server actions that require authentication
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error(ServerActionError.UNAUTHORIZED)
  }

  return user
}

/**
 * Check if user is a member of the specified organization
 */
export async function checkOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<OrganizationMemberWithOrganization | null> {
  try {
    // Validate UUID format
    if (!isValidUUID(organizationId)) {
      return null
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    })

    return member
  } catch (error) {
    console.error('Error checking organization membership:', error)
    return null
  }
}

/**
 * Validate user authentication and organization membership
 * This is the primary auth helper for server actions
 */
export async function validateUserAndOrganization(organizationId: string) {
  // Check authentication
  const user = await getCurrentUser()
  if (!user) {
    throw new Error(ServerActionError.UNAUTHORIZED)
  }

  // Validate organization ID format
  if (!organizationId || !isValidUUID(organizationId)) {
    throw new Error(ServerActionError.VALIDATION_ERROR)
  }

  // Check organization membership
  const member = await checkOrganizationMembership(user.id, organizationId)
  if (!member) {
    throw new Error(ServerActionError.FORBIDDEN)
  }

  return {
    user,
    member,
    organization: member.organization!,
    organizationId,
  }
}

/**
 * Get user's organizations with membership details
 */
export async function getUserOrganizations(userId: string) {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                transactions: true,
                invitations: true,
                paymentMethods: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    })

    return memberships.map(membership => ({
      ...membership.organization,
      membershipRole: membership.role,
      joinedAt: membership.joinedAt,
      stats: membership.organization._count,
    }))
  } catch (error) {
    console.error('Error getting user organizations:', error)
    return []
  }
}


/**
 * Check if user has admin or owner role in organization
 */
export async function requireAdminOrOwnerRole(
  userId: string,
  organizationId: string
): Promise<OrganizationMemberWithOrganization> {
  const member = await checkOrganizationMembership(userId, organizationId)

  if (!member || !['admin', 'owner'].includes(member.role)) {
    throw new Error(ServerActionError.FORBIDDEN)
  }

  return member
}

/**
 * Get organization with full details (for admins and owners)
 */
export async function getOrganizationDetails(
  userId: string,
  organizationId: string
) {
  // Validate admin or owner access
  await requireAdminOrOwnerRole(userId, organizationId)

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        select: {
          id: true,
          userId: true,
          role: true,
          joinedAt: true,
        },
        orderBy: {
          joinedAt: 'desc',
        },
      },
      invitations: {
        where: {
          status: 'pending',
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          transactions: true,
          invitations: true,
          paymentMethods: true,
        },
      },
    },
  })

  return organization
}

/**
 * Utility function to validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Create standardized server action error response
 */
export function createErrorResponse(
  error: string,
  message?: string
): ServerActionResult<never> {
  return {
    success: false,
    error,
    message: message || getErrorMessage(error),
  }
}

/**
 * Create standardized server action success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ServerActionResult<T> {
  return {
    success: true,
    data,
    message,
  }
}

/**
 * Get user-friendly error messages
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case ServerActionError.UNAUTHORIZED:
      return '로그인이 필요합니다.'
    case ServerActionError.FORBIDDEN:
      return '이 작업을 수행할 권한이 없습니다.'
    case ServerActionError.NOT_FOUND:
      return '요청한 리소스를 찾을 수 없습니다.'
    case ServerActionError.VALIDATION_ERROR:
      return '입력 데이터가 올바르지 않습니다.'
    case ServerActionError.DATABASE_ERROR:
      return '데이터베이스 오류가 발생했습니다.'
    default:
      return '알 수 없는 오류가 발생했습니다.'
  }
}

/**
 * Wrapper for server actions with error handling
 */
export async function withErrorHandling<T>(
  action: () => Promise<T>
): Promise<ServerActionResult<T>> {
  try {
    const result = await action()
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Server action error:', error || 'Unknown error')

    if (error instanceof Error) {
      // Check if it's one of our known error types (including UNAUTHORIZED)
      if (
        Object.values(ServerActionError).includes(
          error.message as ServerActionError
        )
      ) {
        return createErrorResponse(error.message)
      }

      // Handle Prisma errors
      if (error.message.includes('Unique constraint failed')) {
        return createErrorResponse(
          ServerActionError.VALIDATION_ERROR,
          '중복된 데이터가 있습니다.'
        )
      }

      if (error.message.includes('Foreign key constraint failed')) {
        return createErrorResponse(
          ServerActionError.VALIDATION_ERROR,
          '참조된 데이터가 존재하지 않습니다.'
        )
      }
    }

    return createErrorResponse(ServerActionError.UNKNOWN_ERROR)
  }
}

/**
 * Helper to extract organization ID from various input types
 */
export function extractOrganizationId(
  input: string | { organizationId: string } | { organization_id: string }
): string {
  if (typeof input === 'string') {
    return input
  }

  if ('organizationId' in input) {
    return input.organizationId
  }

  if ('organization_id' in input) {
    return input.organization_id
  }

  throw new Error(ServerActionError.VALIDATION_ERROR)
}

/**
 * Validate required fields in input data
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })

  if (missingFields.length > 0) {
    throw new Error(
      `${ServerActionError.VALIDATION_ERROR}: Missing required fields: ${missingFields.join(', ')}`
    )
  }
}

/**
 * Sanitize input data by removing undefined/null values
 */
export function sanitizeInput<T extends Record<string, any>>(
  data: T
): Partial<T> {
  const sanitized: Partial<T> = {}

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key as keyof T] = value
    }
  }

  return sanitized
}
