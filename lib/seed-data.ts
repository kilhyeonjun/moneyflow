// 시스템 기본 데이터 정의

export interface DefaultPaymentMethodData {
  name: string
  type: string
}

// 기본 결제수단 데이터
export const defaultPaymentMethods: DefaultPaymentMethodData[] = [
  { name: '현금', type: 'cash' },
  { name: '신용카드', type: 'card' },
  { name: '체크카드', type: 'card' },
  { name: '계좌이체', type: 'account' },
  { name: '모바일페이', type: 'other' },
]
