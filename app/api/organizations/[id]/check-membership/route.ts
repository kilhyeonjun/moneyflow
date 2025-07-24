import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { id: organizationId } = await params

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'User ID and Organization ID are required' },
        { status: 400 }
      )
    }

    // Validate UUID formats
    if (!isValidUUID(userId) || !isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid ID format. Must be valid UUIDs.' },
        { status: 400 }
      )
    }

    // 사용자가 해당 조직의 멤버인지 확인하고 조직 정보 반환
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: userId,
        organizationId: organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(membership.organization)
  } catch (error) {
    console.error(
      'Check membership error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to check organization membership' },
      { status: 500 }
    )
  }
}