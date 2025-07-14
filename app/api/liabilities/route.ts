import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    const liabilities = await prisma.liability.findMany({
      where: {
        organizationId: organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(liabilities)
  } catch (error) {
    console.error('Liabilities fetch error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to fetch liabilities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      type,
      currentAmount,
      organizationId,
      createdBy,
    } = body

    if (
      !name ||
      !type ||
      currentAmount === undefined ||
      !organizationId ||
      !createdBy
    ) {
      return NextResponse.json(
        {
          error:
            'Name, type, currentAmount, organizationId, and createdBy are required',
        },
        { status: 400 }
      )
    }

    // Validate UUID formats
    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (!isValidUUID(createdBy)) {
      return NextResponse.json(
        { error: 'Invalid createdBy ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    const liability = await prisma.liability.create({
      data: {
        name,
        description,
        type,
        currentAmount: parseFloat(currentAmount),
        organizationId,
        createdBy,
      },
    })

    return NextResponse.json(liability, { status: 201 })
  } catch (error) {
    console.error('Liability creation error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to create liability' },
      { status: 500 }
    )
  }
}
