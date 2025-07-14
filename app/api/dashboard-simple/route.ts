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

    // 간단한 데이터만 조회
    const [totalAssets, totalTransactions, categories] = await Promise.all([
      prisma.asset.count({
        where: { organizationId },
      }),

      prisma.transactions.count({
        where: { organization_id: organizationId },
      }),

      prisma.categories.count({
        where: { organization_id: organizationId },
      }),
    ])

    const dashboardData = {
      counts: {
        assets: totalAssets,
        transactions: totalTransactions,
        categories: categories,
      },
      organizationId,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error(
      'Simple dashboard error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
