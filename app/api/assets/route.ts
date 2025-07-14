import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const assets = await prisma.asset.findMany({
      where: {
        organizationId: organizationId,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Assets fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
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
      categoryId, 
      currentValue, 
      organizationId, 
      createdBy 
    } = body

    if (!name || !categoryId || currentValue === undefined || !organizationId || !createdBy) {
      return NextResponse.json(
        { error: 'Name, categoryId, currentValue, organizationId, and createdBy are required' },
        { status: 400 }
      )
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        description,
        categoryId,
        currentValue: parseFloat(currentValue),
        organizationId,
        createdBy,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Asset creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create asset', details: error },
      { status: 500 }
    )
  }
}
