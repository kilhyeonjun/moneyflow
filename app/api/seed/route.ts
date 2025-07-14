import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidUUID } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, includeSampleData = false } = body

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

    // 기본 자산 카테고리 생성
    const assetCategories = [
      { name: '현금 및 예금', type: 'cash', icon: '💰', color: '#10B981' },
      { name: '투자 자산', type: 'financial', icon: '📈', color: '#3B82F6' },
      { name: '부동산', type: 'financial', icon: '🏠', color: '#8B5CF6' },
      { name: '퇴직연금', type: 'retirement', icon: '🏦', color: '#F59E0B' },
      { name: '기타 자산', type: 'other', icon: '📦', color: '#6B7280' },
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
            icon: category.icon,
            color: category.color,
            organizationId: organizationId,
          },
        })
        createdAssetCategories.push(created)
      }
    }

    // 기본 거래 카테고리 생성
    const transactionCategories = [
      // 수입 카테고리
      { name: '급여', type: 'income', level: 1, icon: '💼', color: '#10B981' },
      { name: '부업', type: 'income', level: 1, icon: '💻', color: '#059669' },
      {
        name: '투자 수익',
        type: 'income',
        level: 1,
        icon: '📈',
        color: '#047857',
      },
      {
        name: '기타 수입',
        type: 'income',
        level: 1,
        icon: '💰',
        color: '#065F46',
      },

      // 지출 카테고리
      { name: '식비', type: 'expense', level: 1, icon: '🍽️', color: '#EF4444' },
      {
        name: '교통비',
        type: 'expense',
        level: 1,
        icon: '🚗',
        color: '#DC2626',
      },
      {
        name: '주거비',
        type: 'expense',
        level: 1,
        icon: '🏠',
        color: '#B91C1C',
      },
      {
        name: '의료비',
        type: 'expense',
        level: 1,
        icon: '🏥',
        color: '#991B1B',
      },
      {
        name: '교육비',
        type: 'expense',
        level: 1,
        icon: '📚',
        color: '#7F1D1D',
      },
      {
        name: '문화생활',
        type: 'expense',
        level: 1,
        icon: '🎬',
        color: '#F97316',
      },
      { name: '쇼핑', type: 'expense', level: 1, icon: '🛍️', color: '#EA580C' },
      {
        name: '기타 지출',
        type: 'expense',
        level: 1,
        icon: '💸',
        color: '#9A3412',
      },

      // 저축 카테고리
      { name: '저축', type: 'savings', level: 1, icon: '🏦', color: '#3B82F6' },
      { name: '투자', type: 'savings', level: 1, icon: '📊', color: '#2563EB' },
      {
        name: '대출 상환',
        type: 'savings',
        level: 1,
        icon: '💳',
        color: '#1D4ED8',
      },
    ]

    const createdTransactionCategories = []
    for (const category of transactionCategories) {
      const existing = await prisma.categories.findFirst({
        where: {
          name: category.name,
          organization_id: organizationId,
          transaction_type: category.type,
        },
      })

      if (!existing) {
        const created = await prisma.categories.create({
          data: {
            name: category.name,
            transaction_type: category.type,
            level: category.level,
            icon: category.icon,
            color: category.color,
            organization_id: organizationId,
          },
        })
        createdTransactionCategories.push(created)
      }
    }

    const sampleAssets = []
    const sampleTransactions = []

    // 샘플 데이터 생성 (요청 시에만)
    if (includeSampleData) {
      // 샘플 자산 생성
      const cashCategory = createdAssetCategories.find(
        cat => cat.type === 'cash'
      )
      const investmentCategory = createdAssetCategories.find(
        cat => cat.type === 'financial'
      )

      if (cashCategory) {
        const existingCashAsset = await prisma.asset.findFirst({
          where: { organizationId, name: '주거래 통장' },
        })

        if (!existingCashAsset) {
          const cashAsset = await prisma.asset.create({
            data: {
              name: '주거래 통장',
              type: 'savings',
              currentValue: 3000000,
              targetValue: 5000000,
              bank_name: '국민은행',
              account_number: '****-**-****-123',
              description: '주거래 통장',
              organizationId,
              categoryId: cashCategory.id,
            },
          })
          sampleAssets.push(cashAsset)
        }
      }

      if (investmentCategory) {
        const existingInvestment = await prisma.asset.findFirst({
          where: { organizationId, name: '주식 투자' },
        })

        if (!existingInvestment) {
          const investmentAsset = await prisma.asset.create({
            data: {
              name: '주식 투자',
              type: 'investment',
              currentValue: 1500000,
              targetValue: 3000000,
              description: '국내외 주식 포트폴리오',
              organizationId,
              categoryId: investmentCategory.id,
            },
          })
          sampleAssets.push(investmentAsset)
        }
      }

      // 샘플 거래 생성 (최근 30일)
      const salaryCategory = createdTransactionCategories.find(
        cat => cat.name === '급여'
      )
      const foodCategory = createdTransactionCategories.find(
        cat => cat.name === '식비'
      )
      const transportCategory = createdTransactionCategories.find(
        cat => cat.name === '교통비'
      )

      const sampleTransactionData = [
        // 급여 (월초)
        {
          amount: 3500000,
          description: '12월 급여',
          transaction_type: 'income',
          category_id: salaryCategory?.id,
          transaction_date: new Date(2024, 11, 25), // 12월 25일
        },
        // 지출들
        {
          amount: 45000,
          description: '마트 장보기',
          transaction_type: 'expense',
          category_id: foodCategory?.id,
          transaction_date: new Date(2024, 11, 28),
        },
        {
          amount: 15000,
          description: '지하철 교통카드 충전',
          transaction_type: 'expense',
          category_id: transportCategory?.id,
          transaction_date: new Date(2024, 11, 27),
        },
        {
          amount: 25000,
          description: '점심 회식',
          transaction_type: 'expense',
          category_id: foodCategory?.id,
          transaction_date: new Date(2024, 11, 26),
        },
      ]

      // 사용자 ID 필요 (임시로 UUID 생성)
      const tempUserId = '550e8400-e29b-41d4-a716-446655440001'

      for (const txData of sampleTransactionData) {
        if (txData.category_id) {
          const existingTx = await prisma.transactions.findFirst({
            where: {
              organization_id: organizationId,
              description: txData.description,
              amount: txData.amount,
            },
          })

          if (!existingTx) {
            const transaction = await prisma.transactions.create({
              data: {
                ...txData,
                organization_id: organizationId,
                user_id: tempUserId,
              },
            })
            sampleTransactions.push(transaction)
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Default categories created successfully',
      assetCategories: createdAssetCategories,
      transactionCategories: createdTransactionCategories,
      ...(includeSampleData && {
        sampleAssets,
        sampleTransactions,
      }),
    })
  } catch (error) {
    console.error(
      'Seed data creation error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to create seed data' },
      { status: 500 }
    )
  }
}
