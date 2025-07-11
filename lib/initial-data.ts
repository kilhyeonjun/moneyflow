// 조직 생성 시 기본 카테고리와 결제수단을 생성하는 유틸리티

import { supabase } from './supabase'

// 기본 카테고리 데이터
const defaultCategories = [
  // 수입 카테고리
  { name: '급여', type: 'income', level: 1 },
  { name: '부업', type: 'income', level: 1 },
  { name: '투자수익', type: 'income', level: 1 },
  { name: '기타수입', type: 'income', level: 1 },
  
  // 지출 카테고리
  { name: '식비', type: 'expense', level: 1 },
  { name: '교통비', type: 'expense', level: 1 },
  { name: '주거비', type: 'expense', level: 1 },
  { name: '의료비', type: 'expense', level: 1 },
  { name: '교육비', type: 'expense', level: 1 },
  { name: '문화생활', type: 'expense', level: 1 },
  { name: '쇼핑', type: 'expense', level: 1 },
  { name: '기타지출', type: 'expense', level: 1 },
  
  // 저축 카테고리
  { name: '예금', type: 'savings', level: 1 },
  { name: '적금', type: 'savings', level: 1 },
  { name: '투자', type: 'savings', level: 1 },
  { name: '보험', type: 'savings', level: 1 },
]

// 기본 결제수단 데이터
const defaultPaymentMethods = [
  { name: '현금', type: 'cash' },
  { name: '신용카드', type: 'card' },
  { name: '체크카드', type: 'card' },
  { name: '계좌이체', type: 'account' },
  { name: '모바일페이', type: 'other' },
]

export async function createInitialData(organizationId: string) {
  try {
    console.log('기본 데이터 생성 시작:', organizationId)

    // 1. 기본 카테고리 생성
    const categoriesData = defaultCategories.map(category => ({
      ...category,
      organization_id: organizationId,
    }))

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .insert(categoriesData)
      .select()

    if (categoriesError) {
      console.error('카테고리 생성 실패:', categoriesError)
      throw categoriesError
    }

    console.log('카테고리 생성 완료:', categories?.length)

    // 2. 기본 결제수단 생성
    const paymentMethodsData = defaultPaymentMethods.map(method => ({
      ...method,
      organization_id: organizationId,
    }))

    const { data: paymentMethods, error: paymentMethodsError } = await supabase
      .from('payment_methods')
      .insert(paymentMethodsData)
      .select()

    if (paymentMethodsError) {
      console.error('결제수단 생성 실패:', paymentMethodsError)
      throw paymentMethodsError
    }

    console.log('결제수단 생성 완료:', paymentMethods?.length)

    return {
      categories: categories || [],
      paymentMethods: paymentMethods || [],
    }
  } catch (error) {
    console.error('기본 데이터 생성 실패:', error)
    throw error
  }
}

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