import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // 기본 자산 카테고리 생성
    const assetCategories = [
      { name: '현금 및 예금', type: 'cash' },
      { name: '투자 자산', type: 'financial' },
      { name: '부동산', type: 'financial' },
      { name: '퇴직연금', type: 'retirement' },
      { name: '기타 자산', type: 'other' },
    ]

    const createdAssetCategories = []
    for (const category of assetCategories) {
      const existing = await prisma.assetCategory.findFirst({
        where: {
          name: category.name,
          organizationId: organizationId,
        },
      })

      if (!existing) {
        const created = await prisma.assetCategory.create({
          data: {
            name: category.name,
            type: category.type,
            organizationId: organizationId,
          },
        })
        createdAssetCategories.push(created)
      }
    }

    // 기본 거래 카테고리 생성
    const transactionCategories = [
      // 수입 카테고리
      { name: '급여', transaction_type: 'income', level: 1 },
      { name: '부업', transaction_type: 'income', level: 1 },
      { name: '투자 수익', transaction_type: 'income', level: 1 },
      { name: '기타 수입', transaction_type: 'income', level: 1 },
      
      // 지출 카테고리
      { name: '식비', transaction_type: 'expense', level: 1 },
      { name: '교통비', transaction_type: 'expense', level: 1 },
      { name: '주거비', transaction_type: 'expense', level: 1 },
      { name: '의료비', transaction_type: 'expense', level: 1 },
      { name: '교육비', transaction_type: 'expense', level: 1 },
      { name: '문화생활', transaction_type: 'expense', level: 1 },
      { name: '쇼핑', transaction_type: 'expense', level: 1 },
      { name: '기타 지출', transaction_type: 'expense', level: 1 },
      
      // 이체 카테고리
      { name: '저축', transaction_type: 'transfer', level: 1 },
      { name: '투자', transaction_type: 'transfer', level: 1 },
      { name: '대출 상환', transaction_type: 'transfer', level: 1 },
    ]

    const createdTransactionCategories = []
    for (const category of transactionCategories) {
      const existing = await prisma.categories.findFirst({
        where: {
          name: category.name,
          organization_id: organizationId,
          transaction_type: category.transaction_type,
        },
      })

      if (!existing) {
        const created = await prisma.categories.create({
          data: {
            name: category.name,
            transaction_type: category.transaction_type,
            level: category.level,
            organization_id: organizationId,
          },
        })
        createdTransactionCategories.push(created)
      }
    }

    return NextResponse.json({
      message: 'Default categories created successfully',
      assetCategories: createdAssetCategories,
      transactionCategories: createdTransactionCategories,
    })
  } catch (error) {
    console.error('Seed data creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create seed data' },
      { status: 500 }
    )
  }
}
