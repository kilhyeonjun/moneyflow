// 조직 생성 시 기본 데이터를 생성하는 유틸리티

import { prisma } from './prisma'
import { PaymentMethod, Category } from '@prisma/client'
import { defaultPaymentMethods } from './seed-data'

// 기본 카테고리 구조 정의
const DEFAULT_CATEGORIES = {
  income: [
    { name: '급여', displayOrder: 1 },
    { name: '사업수입', displayOrder: 2 },
    { name: '투자수익', displayOrder: 3 },
    { name: '기타수입', displayOrder: 4 },
  ],
  savings: [
    { name: '비상자금', displayOrder: 1 },
    { name: '예적금', displayOrder: 2 },
    { name: '투자', displayOrder: 3 },
  ],
  fixed_expense: [
    {
      name: '주거비',
      displayOrder: 1,
      children: [
        { name: '월세/전세', displayOrder: 1 },
        { name: '관리비', displayOrder: 2 },
        { name: '공과금', displayOrder: 3 },
      ],
    },
    {
      name: '보험료',
      displayOrder: 2,
      children: [
        { name: '건강보험', displayOrder: 1 },
        { name: '자동차보험', displayOrder: 2 },
        { name: '생명보험', displayOrder: 3 },
      ],
    },
    {
      name: '통신비',
      displayOrder: 3,
      children: [
        { name: '휴대폰', displayOrder: 1 },
        { name: '인터넷', displayOrder: 2 },
      ],
    },
    {
      name: '구독료',
      displayOrder: 4,
      children: [
        { name: '스트리밍', displayOrder: 1 },
        { name: '소프트웨어', displayOrder: 2 },
      ],
    },
  ],
  variable_expense: [
    {
      name: '식비',
      displayOrder: 1,
      children: [
        { name: '외식', displayOrder: 1 },
        { name: '배달', displayOrder: 2 },
        { name: '장보기', displayOrder: 3 },
      ],
    },
    {
      name: '교통비',
      displayOrder: 2,
      children: [
        { name: '대중교통', displayOrder: 1 },
        { name: '택시', displayOrder: 2 },
        { name: '주유비', displayOrder: 3 },
      ],
    },
    {
      name: '쇼핑',
      displayOrder: 3,
      children: [
        { name: '의류', displayOrder: 1 },
        { name: '화장품', displayOrder: 2 },
        { name: '생활용품', displayOrder: 3 },
      ],
    },
    { name: '의료비', displayOrder: 4 },
    {
      name: '문화생활',
      displayOrder: 5,
      children: [
        { name: '영화', displayOrder: 1 },
        { name: '도서', displayOrder: 2 },
        { name: '여행', displayOrder: 3 },
      ],
    },
  ],
} as const

type CategoryType = keyof typeof DEFAULT_CATEGORIES
type CategoryData = {
  name: string
  displayOrder: number
  children?: CategoryData[]
}

/**
 * 조직에 기본 카테고리를 생성하는 함수
 */
async function createCategoriesFromDefaults(organizationId: string) {
  try {
    console.log('기본 카테고리 생성 시작')

    const createdCategories: Category[] = []

    for (const [type, categories] of Object.entries(DEFAULT_CATEGORIES)) {
      console.log(`  ${type} 카테고리 생성 중...`)

      for (const categoryData of categories as readonly CategoryData[]) {
        // 부모 카테고리 생성
        const parentCategory = await prisma.category.create({
          data: {
            organizationId,
            name: categoryData.name,
            type: type as CategoryType,
            displayOrder: categoryData.displayOrder,
          },
        })

        createdCategories.push(parentCategory)
        console.log(`    부모 카테고리 생성: ${categoryData.name}`)

        // 자식 카테고리 생성 (있는 경우)
        if (categoryData.children) {
          for (const childData of categoryData.children) {
            const childCategory = await prisma.category.create({
              data: {
                organizationId,
                name: childData.name,
                type: type as CategoryType,
                parentId: parentCategory.id,
                displayOrder: childData.displayOrder,
              },
            })
            createdCategories.push(childCategory)
            console.log(`      자식 카테고리 생성: ${childData.name}`)
          }
        }
      }
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
async function createPaymentMethodsFromDefaults(organizationId: string) {
  try {
    console.log('기본 결제수단 생성 시작')

    const createdPaymentMethods: PaymentMethod[] = []

    for (const methodData of defaultPaymentMethods) {
      // 중복 확인
      const existingMethod = await prisma.paymentMethod.findFirst({
        where: {
          name: methodData.name,
          organizationId: organizationId,
        },
      })

      if (!existingMethod) {
        const paymentMethod = await prisma.paymentMethod.create({
          data: {
            organizationId: organizationId,
            name: methodData.name,
            type: methodData.type,
            isActive: true,
          },
        })

        createdPaymentMethods.push(paymentMethod)
        console.log(`결제수단 생성 완료: ${methodData.name}`)
      }
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

    const paymentMethods =
      await createPaymentMethodsFromDefaults(organizationId)

    const categories = await createCategoriesFromDefaults(organizationId)

    console.log('모든 초기 데이터 생성 완료')

    return {
      paymentMethods,
      categories,
      summary: {
        paymentMethodsCount: paymentMethods.length,
        categoriesCount: categories.length,
      },
    }
  } catch (error) {
    console.error('초기 데이터 생성 실패:', error)
    throw error
  }
}
