// 시스템 기본 카테고리 데이터 정의

export interface DefaultAssetCategoryData {
  name: string
  type: string
  icon: string
  color: string
  order: number
}

export interface DefaultTransactionCategoryData {
  name: string
  level: number
  parentName?: string
  transactionType: string
  icon: string
  color: string
}

export interface DefaultPaymentMethodData {
  name: string
  type: string
}

// 기본 자산 카테고리 데이터
export const defaultAssetCategories: DefaultAssetCategoryData[] = [
  {
    name: '현금 및 예금',
    type: 'cash',
    icon: '💰',
    color: '#10B981',
    order: 1,
  },
  {
    name: '투자 자산',
    type: 'investment',
    icon: '📈',
    color: '#3B82F6',
    order: 2,
  },
  {
    name: '부동산',
    type: 'real_estate',
    icon: '🏠',
    color: '#8B5CF6',
    order: 3,
  },
  {
    name: '퇴직연금',
    type: 'retirement',
    icon: '🏦',
    color: '#F59E0B',
    order: 4,
  },
  {
    name: '기타 자산',
    type: 'other',
    icon: '📦',
    color: '#6B7280',
    order: 5,
  },
]

// 기본 거래 카테고리 데이터 (통계를 위한 최소 대분류)
export const defaultTransactionCategories: DefaultTransactionCategoryData[] = [
  // 수입 카테고리 (2개)
  {
    name: '급여소득',
    level: 1,
    transactionType: 'income',
    icon: '💼',
    color: '#10B981',
  },
  {
    name: '기타수입',
    level: 1,
    transactionType: 'income',
    icon: '💰',
    color: '#059669',
  },

  // 지출 카테고리 (4개)
  {
    name: '생활비',
    level: 1,
    transactionType: 'expense',
    icon: '🏠',
    color: '#EF4444',
  },
  {
    name: '교통비',
    level: 1,
    transactionType: 'expense',
    icon: '🚗',
    color: '#DC2626',
  },
  {
    name: '의료/교육',
    level: 1,
    transactionType: 'expense',
    icon: '🏥',
    color: '#B91C1C',
  },
  {
    name: '기타지출',
    level: 1,
    transactionType: 'expense',
    icon: '💸',
    color: '#991B1B',
  },

  // 이체 카테고리 (2개)
  {
    name: '저축/투자',
    level: 1,
    transactionType: 'transfer',
    icon: '🏦',
    color: '#3B82F6',
  },
  {
    name: '대출상환',
    level: 1,
    transactionType: 'transfer',
    icon: '💳',
    color: '#2563EB',
  },
]

// 기본 결제수단 데이터
export const defaultPaymentMethods: DefaultPaymentMethodData[] = [
  { name: '현금', type: 'cash' },
  { name: '신용카드', type: 'card' },
  { name: '체크카드', type: 'card' },
  { name: '계좌이체', type: 'account' },
  { name: '모바일페이', type: 'other' },
]