// 조직 생성 시 기본 카테고리와 결제수단을 생성하는 유틸리티

import { prisma } from './prisma'
import { Category, PaymentMethod } from '@prisma/client'

// 기본 결제수단 데이터
const defaultPaymentMethods = [
  { name: '현금', type: 'cash' },
  { name: '신용카드', type: 'card' },
  { name: '체크카드', type: 'card' },
  { name: '계좌이체', type: 'bank_account' },
  { name: '모바일페이', type: 'digital_wallet' },
]

/**
 * default_categories 테이블에서 기본 카테고리 데이터를 가져와서
 * 조직별 categories 테이블에 복사하는 함수
 */
async function createCategoriesFromDefaults(organizationId: string) {
  try {
    console.log('기본 카테고리 템플릿 조회 시작')

    // 1. default_categories에서 모든 기본 카테고리 가져오기
    const defaultCategories = await prisma.defaultCategory.findMany({
      orderBy: [{ transactionType: 'asc' }, { level: 'asc' }, { name: 'asc' }],
    })

    if (!defaultCategories || defaultCategories.length === 0) {
      console.warn('기본 카테고리 템플릿이 없습니다.')
      return []
    }

    console.log(`${defaultCategories.length}개의 기본 카테고리 템플릿 발견`)

    // 2. 계층 구조를 고려하여 카테고리 생성
    const categoryMap = new Map<string, string>() // parent_name -> category_id 매핑
    const createdCategories: Category[] = []

    // 레벨별로 정렬하여 부모 카테고리부터 생성
    const sortedCategories = defaultCategories.sort((a, b) => a.level - b.level)

    for (const defaultCategory of sortedCategories) {
      // 부모 카테고리 ID 찾기
      let parentId: string | null = null
      if (defaultCategory.parentName) {
        parentId = categoryMap.get(defaultCategory.parentName) || null
      }

      // 카테고리 생성
      const newCategory = await prisma.category.create({
        data: {
          organizationId: organizationId,
          name: defaultCategory.name,
          level: defaultCategory.level,
          parentId: parentId,
          transactionType: defaultCategory.transactionType,
          icon: defaultCategory.icon,
          color: defaultCategory.color,
          isDefault: true,
        },
      })

      // 매핑에 추가 (자식 카테고리에서 참조할 수 있도록)
      categoryMap.set(defaultCategory.name, newCategory.id)
      createdCategories.push(newCategory)

      console.log(
        `카테고리 생성 완료: ${defaultCategory.name} (레벨 ${defaultCategory.level})`
      )
    }

    console.log(`총 ${createdCategories.length}개의 카테고리가 생성되었습니다.`)
    return createdCategories
  } catch (error) {
    console.error('카테고리 생성 중 오류 발생:', error)
    throw error
  }
}

/**
 * 조직에 기본 결제수단을 생성하는 함수
 */
async function createDefaultPaymentMethods(organizationId: string) {
  try {
    console.log('기본 결제수단 생성 시작')

    const createdPaymentMethods: PaymentMethod[] = []

    for (const method of defaultPaymentMethods) {
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          organizationId: organizationId,
          name: method.name,
          type: method.type,
          isActive: true,
        },
      })

      createdPaymentMethods.push(paymentMethod)
      console.log(`결제수단 생성 완료: ${method.name}`)
    }

    console.log(
      `총 ${createdPaymentMethods.length}개의 결제수단이 생성되었습니다.`
    )
    return createdPaymentMethods
  } catch (error) {
    console.error('결제수단 생성 중 오류 발생:', error)
    throw error
  }
}

/**
 * 새 조직에 대한 모든 기본 데이터를 생성하는 메인 함수
 */
export async function createInitialData(organizationId: string) {
  try {
    console.log(`조직 ${organizationId}에 대한 초기 데이터 생성 시작`)

    // 병렬로 실행하여 성능 향상
    const [categories, paymentMethods] = await Promise.all([
      createCategoriesFromDefaults(organizationId),
      createDefaultPaymentMethods(organizationId),
    ])

    console.log('모든 초기 데이터 생성 완료')

    return {
      categories,
      paymentMethods,
      summary: {
        categoriesCount: categories.length,
        paymentMethodsCount: paymentMethods.length,
      },
    }
  } catch (error) {
    console.error('초기 데이터 생성 실패:', error)
    throw error
  }
}
