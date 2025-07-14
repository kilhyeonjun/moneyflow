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
    console.error('Assets fetch error:', error || 'Unknown error')
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

    // Validate UUID formats
    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (!isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (!isValidUUID(createdBy)) {
      return NextResponse.json(
        { error: 'Invalid createdBy ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 카테고리 존재 확인
    const category = await prisma.assetCategory.findFirst({
      where: {
        id: categoryId,
        organizationId: organizationId,
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      )
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        description,
        categoryId,
        currentValue: parseFloat(currentValue.toString()),
        type: 'savings', // 기본 타입 설정
        organizationId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Asset creation error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      name, 
      description, 
      categoryId, 
      currentValue, 
      targetValue,
      organizationId 
    } = body

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Asset ID and organizationId are required' },
        { status: 400 }
      )
    }

    // Validate UUID formats
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid asset ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (categoryId && !isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid category ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 권한 확인: 해당 조직의 자산인지 검증
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
    })

    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      )
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(categoryId && { categoryId }),
        ...(currentValue !== undefined && { currentValue: parseFloat(currentValue) }),
        ...(targetValue !== undefined && { targetValue: parseFloat(targetValue) }),
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    console.error('Asset update error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const organizationId = searchParams.get('organizationId')

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'Asset ID and organizationId are required' },
        { status: 400 }
      )
    }

    // Validate UUID formats
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid asset ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 권한 확인: 해당 조직의 자산인지 검증
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
    })

    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.asset.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('Asset deletion error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
