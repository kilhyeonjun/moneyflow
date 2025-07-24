import { NextRequest, NextResponse } from 'next/server'
import { createInitialData } from '@/lib/initial-data'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    console.log(`조직 ${organizationId}에 대한 초기 데이터 생성 API 호출`)

    const result = await createInitialData(organizationId)

    return NextResponse.json({
      success: true,
      data: result,
      message: '초기 데이터가 성공적으로 생성되었습니다.',
    })
  } catch (error) {
    console.error('초기 데이터 생성 API 오류:', error)
    return NextResponse.json(
      {
        error: 'Failed to create initial data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}