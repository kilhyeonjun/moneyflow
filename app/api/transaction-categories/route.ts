import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'
import { Prisma } from '@prisma/client'
import { createInitialData } from '@/lib/initial-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const type = searchParams.get('type') // income, expense, transfer

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

    const where: Prisma.CategoryWhereInput = {
      organizationId: organizationId,
    }

    if (type) {
      where.transactionType = type
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
    })

    // 계층형 정렬: 부모 카테고리 다음에 자식 카테고리가 오도록 정렬
    const sortedHierarchically = (categories: any[]) => {
      const result: any[] = []
      const processed = new Set<string>()
      
      // 1단계 카테고리들을 먼저 추가
      const level1Categories = categories.filter(cat => cat.level === 1).sort((a, b) => a.name.localeCompare(b.name))
      
      const addCategoryWithChildren = (category: any) => {
        if (processed.has(category.id)) return
        
        result.push(category)
        processed.add(category.id)
        
        // 이 카테고리의 자식들을 찾아서 추가
        const children = categories
          .filter(cat => cat.parentId === category.id)
          .sort((a, b) => a.name.localeCompare(b.name))
        
        children.forEach(child => addCategoryWithChildren(child))
      }
      
      level1Categories.forEach(category => addCategoryWithChildren(category))
      
      return result
    }
    
    const hierarchicalCategories = sortedHierarchically(categories)

    // 카테고리가 없으면 기본 카테고리를 자동으로 생성
    if (!categories || categories.length === 0) {
      console.log(`조직 ${organizationId}에 거래 카테고리가 없어서 초기 데이터를 생성합니다.`)
      
      try {
        await createInitialData(organizationId)
        
        // 다시 카테고리 조회
        const newCategories = await prisma.category.findMany({
          where,
          orderBy: [
            { level: 'asc' },
            { name: 'asc' },
          ],
        })
        
        const newHierarchicalCategories = sortedHierarchically(newCategories)
        return NextResponse.json(newHierarchicalCategories)
      } catch (initError) {
        console.error('초기 데이터 생성 실패:', initError)
        // 초기 데이터 생성에 실패해도 빈 배열 반환
        return NextResponse.json([])
      }
    }

    return NextResponse.json(hierarchicalCategories)
  } catch (error) {
    console.error(
      'Transaction categories fetch error:',
      error || 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to fetch transaction categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, icon, color, organizationId, parentId } = body

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

    // parentId가 있으면 UUID 형식 검증
    if (parentId && !isValidUUID(parentId)) {
      return NextResponse.json(
        { error: 'Invalid parent ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 타입 검증
    if (!['income', 'expense', 'transfer'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be income, expense, or transfer' },
        { status: 400 }
      )
    }

    // 부모 카테고리가 있는 경우 검증
    let level = 1
    if (parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentId,
          organizationId: organizationId,
        },
      })

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        )
      }

      // 부모와 같은 transactionType인지 확인
      if (parentCategory.transactionType !== type) {
        return NextResponse.json(
          { error: 'Child category must have the same transaction type as parent' },
          { status: 400 }
        )
      }

      level = parentCategory.level + 1
    }

    const category = await prisma.category.create({
      data: {
        name,
        transactionType: type,
        icon,
        color,
        organizationId: organizationId,
        parentId: parentId,
        level: level,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error(
      'Transaction category creation error:',
      error || 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to create transaction category' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, icon, color, organizationId, parentId } = body

    if (!id || !name || !organizationId) {
      return NextResponse.json(
        { error: 'ID, name, and organizationId are required' },
        { status: 400 }
      )
    }

    // Validate UUID formats
    if (!isValidUUID(id) || !isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 }
      )
    }

    if (parentId && !isValidUUID(parentId)) {
      return NextResponse.json(
        { error: 'Invalid parent ID format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    // 기존 카테고리 확인
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 기본 카테고리는 수정할 수 없음
    if (existingCategory.isDefault) {
      return NextResponse.json(
        { error: 'Cannot modify default categories' },
        { status: 403 }
      )
    }

    // 부모 카테고리 변경 시 검증
    let level = existingCategory.level
    if (parentId !== undefined) {
      if (parentId === null) {
        level = 1
      } else {
        // 자기 자신을 부모로 설정하는 것 방지
        if (parentId === id) {
          return NextResponse.json(
            { error: 'Category cannot be its own parent' },
            { status: 400 }
          )
        }

        const parentCategory = await prisma.category.findFirst({
          where: {
            id: parentId,
            organizationId: organizationId,
          },
        })

        if (!parentCategory) {
          return NextResponse.json(
            { error: 'Parent category not found' },
            { status: 400 }
          )
        }

        // 부모와 같은 transactionType인지 확인
        if (parentCategory.transactionType !== existingCategory.transactionType) {
          return NextResponse.json(
            { error: 'Child category must have the same transaction type as parent' },
            { status: 400 }
          )
        }

        level = parentCategory.level + 1
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: id },
      data: {
        name,
        icon,
        color,
        parentId: parentId,
        level: level,
      },
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error(
      'Transaction category update error:',
      error || 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to update transaction category' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, organizationId } = body

    if (!id || !organizationId) {
      return NextResponse.json(
        { error: 'ID and organizationId are required' },
        { status: 400 }
      )
    }

    // Validate UUID formats
    if (!isValidUUID(id) || !isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 }
      )
    }

    // 기존 카테고리 확인
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 기본 카테고리는 삭제할 수 없음
    if (existingCategory.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default categories' },
        { status: 403 }
      )
    }

    // 거래에서 사용 중인 카테고리인지 확인
    const transactionsUsingCategory = await prisma.transaction.findFirst({
      where: {
        categoryId: id,
        organizationId: organizationId,
      },
    })

    if (transactionsUsingCategory) {
      return NextResponse.json(
        { error: 'Cannot delete category that is being used by transactions' },
        { status: 400 }
      )
    }

    // 자식 카테고리가 있는지 확인
    const childCategories = await prisma.category.findFirst({
      where: {
        parentId: id,
        organizationId: organizationId,
      },
    })

    if (childCategories) {
      return NextResponse.json(
        { error: 'Cannot delete category that has child categories' },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error(
      'Transaction category deletion error:',
      error || 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to delete transaction category' },
      { status: 500 }
    )
  }
}
