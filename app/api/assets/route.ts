import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'
import { GoalSyncManager, createAssetChangeEvent } from '@/lib/goal-sync'

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
      createdBy,
    } = body

    if (
      !name ||
      !categoryId ||
      currentValue === undefined ||
      !organizationId ||
      !createdBy
    ) {
      return NextResponse.json(
        {
          error:
            'Name, categoryId, currentValue, organizationId, and createdBy are required',
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
        categoryId: categoryId,
        currentValue: parseFloat(currentValue.toString()),
        type: 'savings', // 기본 타입 설정
        organizationId: organizationId,
      },
      include: {
        category: true,
      },
    })

    // 자산 생성 후 목표 동기화 트리거
    try {
      const changeEvent = createAssetChangeEvent(
        'CREATE',
        asset.id,
        Number(asset.currentValue),
        asset.type
      )
      await GoalSyncManager.triggerSync(organizationId, changeEvent)
      console.log(`✅ 목표 동기화 완료 (자산 생성): ${asset.name}`)
    } catch (syncError) {
      console.error('⚠️ 목표 동기화 실패 (자산 생성):', syncError)
      // 동기화 실패해도 자산 생성은 성공으로 처리
    }

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
      organizationId,
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
        ...(categoryId && { categoryId: categoryId }),
        ...(currentValue !== undefined && {
          currentValue: parseFloat(currentValue),
        }),
        ...(targetValue !== undefined && {
          targetValue: parseFloat(targetValue),
        }),
      },
      include: {
        category: true,
      },
    })

    // 자산 수정 후 목표 동기화 트리거 (currentValue가 변경된 경우)
    if (currentValue !== undefined) {
      try {
        const changeEvent = createAssetChangeEvent(
          'UPDATE',
          updatedAsset.id,
          Number(updatedAsset.currentValue),
          updatedAsset.type,
          Number(existingAsset.currentValue) // 이전 값
        )
        await GoalSyncManager.triggerSync(organizationId, changeEvent)
        console.log(`✅ 목표 동기화 완료 (자산 수정): ${updatedAsset.name}`)
      } catch (syncError) {
        console.error('⚠️ 목표 동기화 실패 (자산 수정):', syncError)
        // 동기화 실패해도 자산 수정은 성공으로 처리
      }
    }

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

    // 자산 삭제 후 목표 동기화 트리거
    try {
      const changeEvent = createAssetChangeEvent(
        'DELETE',
        existingAsset.id,
        0, // 삭제된 자산의 현재 값은 0
        existingAsset.type,
        Number(existingAsset.currentValue) // 삭제된 자산의 이전 값
      )
      await GoalSyncManager.triggerSync(organizationId, changeEvent)
      console.log(`✅ 목표 동기화 완료 (자산 삭제): ${existingAsset.name}`)
    } catch (syncError) {
      console.error('⚠️ 목표 동기화 실패 (자산 삭제):', syncError)
      // 동기화 실패해도 자산 삭제는 성공으로 처리
    }

    return NextResponse.json({ message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('Asset deletion error:', error || 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
