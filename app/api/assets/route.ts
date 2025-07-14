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
        ...(createdBy && { createdBy }),
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
    console.error('Asset update error:', error)
    return NextResponse.json(
      { error: 'Failed to update asset', details: error },
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
    console.error('Asset deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset', details: error },
      { status: 500 }
    )
  }
}
