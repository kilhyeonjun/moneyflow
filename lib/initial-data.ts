// 조직 생성 시 기본 카테고리와 결제수단을 생성하는 유틸리티

import { prisma } from './prisma'
import { Category, PaymentMethod, AssetCategory } from '@prisma/client'
import {
  defaultAssetCategories,
  defaultTransactionCategories,
  defaultPaymentMethods,
} from './seed-data'

/**
 * 기본 자산 카테고리를 조직별로 생성하는 함수
 */
async function createAssetCategoriesFromDefaults(organizationId: string) {
  try {
    console.log('기본 자산 카테고리 생성 시작')

    const createdAssetCategories: AssetCategory[] = []

    for (const categoryData of defaultAssetCategories) {
      // 중복 확인
      const existingCategory = await prisma.assetCategory.findFirst({
        where: {
          name: categoryData.name,
          organizationId: organizationId,
        },
      })

      if (!existingCategory) {
        const newCategory = await prisma.assetCategory.create({
          data: {
            organizationId: organizationId,
            name: categoryData.name,
            type: categoryData.type,
            icon: categoryData.icon,
            color: categoryData.color,
            isDefault: true,
          },
        })
        createdAssetCategories.push(newCategory)
        console.log(`자산 카테고리 생성 완료: ${categoryData.name}`)
      }
    }

    console.log(
      `총 ${createdAssetCategories.length}개의 자산 카테고리가 생성되었습니다.`
    )
    return createdAssetCategories
  } catch (error) {
    console.error('자산 카테고리 생성 중 오류 발생:', error)
    throw error
  }
}

/**
 * 기본 거래 카테고리를 조직별로 생성하는 함수
 */
async function createTransactionCategoriesFromDefaults(organizationId: string) {
  try {
    console.log('기본 거래 카테고리 생성 시작')

    // 계층 구조를 고려하여 카테고리 생성
    const categoryMap = new Map<string, string>() // parent_name -> category_id 매핑
    const createdCategories: Category[] = []

    // 레벨별로 정렬하여 부모 카테고리부터 생성
    const sortedCategories = defaultTransactionCategories.sort(
      (a, b) => a.level - b.level
    )

    for (const categoryData of sortedCategories) {
      // 중복 확인
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: categoryData.name,
          organizationId: organizationId,
          transactionType: categoryData.transactionType,
        },
      })

      if (!existingCategory) {
        // 부모 카테고리 ID 찾기
        let parentId: string | null = null
        if (categoryData.parentName) {
          parentId = categoryMap.get(categoryData.parentName) || null
        }

        // 카테고리 생성
        const newCategory = await prisma.category.create({
          data: {
            organizationId: organizationId,
            name: categoryData.name,
            level: categoryData.level,
            parentId: parentId,
            transactionType: categoryData.transactionType,
            icon: categoryData.icon,
            color: categoryData.color,
            isDefault: true,
          },
        })

        // 매핑에 추가 (자식 카테고리에서 참조할 수 있도록)
        categoryMap.set(categoryData.name, newCategory.id)
        createdCategories.push(newCategory)

        console.log(
          `거래 카테고리 생성 완료: ${categoryData.name} (레벨 ${categoryData.level})`
        )
      }
    }

    console.log(
      `총 ${createdCategories.length}개의 거래 카테고리가 생성되었습니다.`
    )
    return createdCategories
  } catch (error) {
    console.error('거래 카테고리 생성 중 오류 발생:', error)
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

    // 병렬로 실행하여 성능 향상
    const [assetCategories, transactionCategories, paymentMethods] =
      await Promise.all([
        createAssetCategoriesFromDefaults(organizationId),
        createTransactionCategoriesFromDefaults(organizationId),
        createPaymentMethodsFromDefaults(organizationId),
      ])

    console.log('모든 초기 데이터 생성 완료')

    return {
      assetCategories,
      transactionCategories,
      paymentMethods,
      summary: {
        assetCategoriesCount: assetCategories.length,
        transactionCategoriesCount: transactionCategories.length,
        paymentMethodsCount: paymentMethods.length,
      },
    }
  } catch (error) {
    console.error('초기 데이터 생성 실패:', error)
    throw error
  }
}
