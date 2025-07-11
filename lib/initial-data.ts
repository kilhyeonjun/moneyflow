// 조직 생성 시 기본 카테고리와 결제수단을 생성하는 유틸리티

import { supabase } from './supabase'
import { Database } from '@/types/database'

type DefaultCategory = Database['public']['Tables']['default_categories']['Row']

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
    const { data: defaultCategories, error: fetchError } = await supabase
      .from('default_categories')
      .select('*')
      .order('transaction_type')
      .order('level')
      .order('name')

    if (fetchError) {
      console.error('기본 카테고리 조회 실패:', fetchError)
      throw fetchError
    }

    if (!defaultCategories || defaultCategories.length === 0) {
      console.warn('기본 카테고리 템플릿이 없습니다.')
      return []
    }

    console.log(`${defaultCategories.length}개의 기본 카테고리 템플릿 발견`)

    // 2. 계층 구조를 고려하여 카테고리 생성
    const categoryMap = new Map<string, string>() // parent_name -> category_id 매핑
    const createdCategories: any[] = []

    // 레벨별로 정렬하여 부모 카테고리부터 생성
    const sortedCategories = defaultCategories.sort((a, b) => a.level - b.level)

    for (const defaultCategory of sortedCategories) {
      // 부모 카테고리 ID 찾기
      let parentId: string | null = null
      if (defaultCategory.parent_name && defaultCategory.level > 1) {
        parentId = categoryMap.get(defaultCategory.parent_name) || null
      }

      // 카테고리 데이터 준비
      const categoryData = {
        name: defaultCategory.name,
        transaction_type: defaultCategory.transaction_type,
        level: defaultCategory.level,
        parent_id: parentId,
        organization_id: organizationId,
        icon: defaultCategory.icon,
        color: defaultCategory.color,
        is_default: true, // 기본 카테고리임을 표시
      }

      // 카테고리 생성
      const { data: createdCategory, error: createError } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single()

      if (createError) {
        console.error('카테고리 생성 실패:', createError, categoryData)
        throw createError
      }

      // 생성된 카테고리를 맵에 추가 (자식 카테고리에서 참조할 수 있도록)
      categoryMap.set(defaultCategory.name, createdCategory.id)
      createdCategories.push(createdCategory)

      console.log(`카테고리 생성: ${defaultCategory.name} (레벨 ${defaultCategory.level})`)
    }

    console.log(`총 ${createdCategories.length}개 카테고리 생성 완료`)
    return createdCategories

  } catch (error) {
    console.error('기본 카테고리 생성 실패:', error)
    throw error
  }
}

/**
 * 기본 결제수단을 생성하는 함수
 */
async function createDefaultPaymentMethods(organizationId: string) {
  try {
    console.log('기본 결제수단 생성 시작')

    const paymentMethodsData = defaultPaymentMethods.map(method => ({
      ...method,
      organization_id: organizationId,
      is_active: true,
    }))

    const { data: paymentMethods, error: paymentMethodsError } = await supabase
      .from('payment_methods')
      .insert(paymentMethodsData)
      .select()

    if (paymentMethodsError) {
      console.error('결제수단 생성 실패:', paymentMethodsError)
      throw paymentMethodsError
    }

    console.log(`${paymentMethods?.length || 0}개 결제수단 생성 완료`)
    return paymentMethods || []

  } catch (error) {
    console.error('기본 결제수단 생성 실패:', error)
    throw error
  }
}

/**
 * 조직 생성 시 기본 데이터(카테고리 + 결제수단)를 생성하는 메인 함수
 */
export async function createInitialData(organizationId: string) {
  try {
    console.log('조직별 기본 데이터 생성 시작:', organizationId)

    // 1. default_categories 테이블에서 기본 카테고리 생성
    const categories = await createCategoriesFromDefaults(organizationId)

    // 2. 기본 결제수단 생성
    const paymentMethods = await createDefaultPaymentMethods(organizationId)

    console.log('조직별 기본 데이터 생성 완료:', {
      categories: categories.length,
      paymentMethods: paymentMethods.length,
    })

    return {
      categories,
      paymentMethods,
    }
  } catch (error) {
    console.error('조직별 기본 데이터 생성 실패:', error)
    throw error
  }
}

/**
 * 기존 조직에 기본 데이터가 있는지 확인하고 없으면 생성하는 함수
 */
export async function checkAndCreateInitialData(organizationId: string) {
  try {
    // 기존 카테고리 확인
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)

    // 기존 결제수단 확인
    const { data: existingPaymentMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)

    // 둘 다 없으면 기본 데이터 생성
    if ((!existingCategories || existingCategories.length === 0) && 
        (!existingPaymentMethods || existingPaymentMethods.length === 0)) {
      console.log('기본 데이터가 없어서 생성합니다.')
      return await createInitialData(organizationId)
    }

    console.log('기본 데이터가 이미 존재합니다.')
    return null
  } catch (error) {
    console.error('기본 데이터 확인 실패:', error)
    throw error
  }
}
