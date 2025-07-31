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

// 기본 거래 카테고리 데이터
export const defaultTransactionCategories: DefaultTransactionCategoryData[] = [
  // 수입 카테고리 (Level 1)
  {
    name: '급여',
    level: 1,
    transactionType: 'income',
    icon: '💼',
    color: '#10B981',
  },
  {
    name: '부업',
    level: 1,
    transactionType: 'income',
    icon: '💻',
    color: '#059669',
  },
  {
    name: '투자 수익',
    level: 1,
    transactionType: 'income',
    icon: '📈',
    color: '#047857',
  },
  {
    name: '기타 수입',
    level: 1,
    transactionType: 'income',
    icon: '💰',
    color: '#065F46',
  },

  // 지출 카테고리 (Level 1)
  {
    name: '식비',
    level: 1,
    transactionType: 'expense',
    icon: '🍽️',
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
    name: '주거비',
    level: 1,
    transactionType: 'expense',
    icon: '🏠',
    color: '#B91C1C',
  },
  {
    name: '의료비',
    level: 1,
    transactionType: 'expense',
    icon: '🏥',
    color: '#991B1B',
  },
  {
    name: '교육비',
    level: 1,
    transactionType: 'expense',
    icon: '📚',
    color: '#7F1D1D',
  },
  {
    name: '문화생활',
    level: 1,
    transactionType: 'expense',
    icon: '🎬',
    color: '#F97316',
  },
  {
    name: '쇼핑',
    level: 1,
    transactionType: 'expense',
    icon: '🛍️',
    color: '#EA580C',
  },
  {
    name: '기타 지출',
    level: 1,
    transactionType: 'expense',
    icon: '💸',
    color: '#9A3412',
  },

  // 이체 카테고리 (Level 1) - 저축과 투자를 이체로 분류
  {
    name: '저축',
    level: 1,
    transactionType: 'transfer',
    icon: '🏦',
    color: '#3B82F6',
  },
  {
    name: '투자',
    level: 1,
    transactionType: 'transfer',
    icon: '📊',
    color: '#2563EB',
  },
  {
    name: '대출 상환',
    level: 1,
    transactionType: 'transfer',
    icon: '💳',
    color: '#1D4ED8',
  },

  // 세부 카테고리 (Level 2) - 식비 하위
  {
    name: '외식',
    level: 2,
    parentName: '식비',
    transactionType: 'expense',
    icon: '🍴',
    color: '#F87171',
  },
  {
    name: '장보기',
    level: 2,
    parentName: '식비',
    transactionType: 'expense',
    icon: '🛒',
    color: '#FCA5A5',
  },
  {
    name: '배달음식',
    level: 2,
    parentName: '식비',
    transactionType: 'expense',
    icon: '🚚',
    color: '#FECACA',
  },

  // 세부 카테고리 (Level 2) - 주거비 하위
  {
    name: '월세/관리비',
    level: 2,
    parentName: '주거비',
    transactionType: 'expense',
    icon: '🏘️',
    color: '#DC2626',
  },
  {
    name: '공과금',
    level: 2,
    parentName: '주거비',
    transactionType: 'expense',
    icon: '⚡',
    color: '#EF4444',
  },
  {
    name: '인테리어',
    level: 2,
    parentName: '주거비',
    transactionType: 'expense',
    icon: '🪑',
    color: '#F87171',
  },

  // 세부 카테고리 (Level 2) - 문화생활 하위
  {
    name: '영화/공연',
    level: 2,
    parentName: '문화생활',
    transactionType: 'expense',
    icon: '🎭',
    color: '#FB923C',
  },
  {
    name: '여행',
    level: 2,
    parentName: '문화생활',
    transactionType: 'expense',
    icon: '✈️',
    color: '#FDBA74',
  },
  {
    name: '취미',
    level: 2,
    parentName: '문화생활',
    transactionType: 'expense',
    icon: '🎨',
    color: '#FED7AA',
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