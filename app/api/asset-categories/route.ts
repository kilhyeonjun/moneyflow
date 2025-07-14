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

    const categories = await prisma.assetCategory.findMany({
      where: {
        organizationId: organizationId,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Asset categories fetch error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to fetch asset categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, icon, color, organizationId } = body

    if (!name || !type || !organizationId) {
      return NextResponse.json(
        { error: 'Name, type, and organizationId are required' },
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

    const category = await prisma.assetCategory.create({
      data: {
        name,
        type,
        icon,
        color,
        organizationId,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Asset category creation error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to create asset category' },
      { status: 500 }
    )
  }
}
