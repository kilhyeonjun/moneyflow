import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 사용자가 속한 조직들 조회
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          select: {
            role: true,
            joinedAt: true,
          },
        },
        _count: {
          select: {
            members: true,
            transactions: true,
            assets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(organizations)
  } catch (error) {
    console.error(
      'Organizations fetch error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, createdBy } = body

    if (!name || !createdBy) {
      return NextResponse.json(
        { error: 'Name and createdBy are required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(createdBy)) {
      return NextResponse.json(
        { error: 'Invalid createdBy ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 트랜잭션으로 조직과 멤버십을 동시에 생성
    const result = await prisma.$transaction(async tx => {
      // 조직 생성
      const organization = await tx.organization.create({
        data: {
          name,
          description,
          createdBy: createdBy,
        },
      })

      // 생성자를 관리자로 멤버십 추가
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: createdBy,
          role: 'admin',
        },
      })

      return organization
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(
      'Organization creation error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
