'use client'

import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Home,
  Car,
  ShoppingCart,
  Coffee,
  Smartphone,
  HeartHandshake,
  Gamepad2,
  GraduationCap,
  Wallet,
} from 'lucide-react'

export type TransactionType =
  | 'income'
  | 'savings'
  | 'fixed_expense'
  | 'variable_expense'

interface CategoryIconProps {
  type: TransactionType
  size?: number
  className?: string
}

// 거래 유형별 아이콘 정의
const getTypeIcon = (type: TransactionType) => {
  switch (type) {
    case 'income':
      return TrendingUp
    case 'savings':
      return PiggyBank
    case 'fixed_expense':
      return Home
    case 'variable_expense':
      return TrendingDown
    default:
      return Wallet
  }
}

// 거래 유형별 색상 정의
const getTypeColor = (type: TransactionType) => {
  switch (type) {
    case 'income':
      return 'text-green-600'
    case 'savings':
      return 'text-blue-600'
    case 'fixed_expense':
      return 'text-red-600'
    case 'variable_expense':
      return 'text-orange-600'
    default:
      return 'text-gray-600'
  }
}

// 거래 유형별 한글명 정의
export const getTypeName = (type: TransactionType) => {
  switch (type) {
    case 'income':
      return '수입'
    case 'savings':
      return '저축'
    case 'fixed_expense':
      return '고정 지출'
    case 'variable_expense':
      return '변동 지출'
    default:
      return type
  }
}

// 카테고리별 아이콘 정의 (대분류/소분류에서 사용)
export const getCategoryIcon = (
  categoryName: string,
  categoryType: TransactionType
) => {
  // 일반적인 카테고리명에 따른 아이콘 매핑
  const categoryIconMap: Record<string, React.ElementType> = {
    // 수입 관련
    급여: Wallet,
    사업소득: TrendingUp,
    투자수익: TrendingUp,
    기타수입: Wallet,

    // 저축 관련
    예금: PiggyBank,
    적금: PiggyBank,
    투자: TrendingUp,
    연금: PiggyBank,

    // 고정지출 관련
    주거비: Home,
    교통비: Car,
    통신비: Smartphone,
    보험료: HeartHandshake,
    교육비: GraduationCap,

    // 변동지출 관련
    식비: Coffee,
    쇼핑: ShoppingCart,
    여가: Gamepad2,
    의료비: HeartHandshake,
    기타: Wallet,
  }

  const IconComponent =
    categoryIconMap[categoryName] || getTypeIcon(categoryType)
  return IconComponent
}

/**
 * 거래 유형별 아이콘 컴포넌트
 *
 * 기능:
 * - 거래 유형에 따른 아이콘 표시
 * - 타입별 색상 시스템 적용
 * - 크기 조절 가능
 */
export default function CategoryIcon({
  type,
  size = 16,
  className = '',
}: CategoryIconProps) {
  const IconComponent = getTypeIcon(type)
  const colorClass = getTypeColor(type)

  return <IconComponent size={size} className={`${colorClass} ${className}`} />
}

/**
 * 카테고리 이름에 따른 아이콘 컴포넌트
 */
export function CategoryNameIcon({
  categoryName,
  categoryType,
  size = 16,
  className = '',
}: {
  categoryName: string
  categoryType: TransactionType
  size?: number
  className?: string
}) {
  const IconComponent = getCategoryIcon(categoryName, categoryType)
  const colorClass = getTypeColor(categoryType)

  return <IconComponent size={size} className={`${colorClass} ${className}`} />
}
