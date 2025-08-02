'use client'

import React from 'react'
import { Button } from '@heroui/react'
import { ChevronRight } from 'lucide-react'
import CategoryIcon, {
  getTypeName,
  CategoryNameIcon,
  type TransactionType,
} from './CategoryIcon'

interface CategoryBreadcrumbProps {
  /** 선택된 거래 유형 */
  selectedType?: TransactionType
  /** 선택된 대분류 카테고리 */
  selectedParentCategory?: {
    id: string
    name: string
    type: TransactionType
  }
  /** 선택된 소분류 카테고리 */
  selectedCategory?: {
    id: string
    name: string
    type: TransactionType
    parent?: {
      id: string
      name: string
      type: TransactionType
    }
  }
  /** 단계 클릭 시 호출되는 콜백 */
  onStepClick?: (step: 'type' | 'parent' | 'category', id?: string) => void
  /** 읽기 전용 모드 (클릭 비활성화) */
  readOnly?: boolean
  /** 추가 CSS 클래스 */
  className?: string
}

/**
 * 카테고리 선택 경로를 표시하는 Breadcrumb 컴포넌트
 *
 * 기능:
 * - 거래유형 > 대분류 > 소분류 경로 표시
 * - 각 단계 클릭 시 해당 단계로 이동
 * - 아이콘과 색상 시스템 적용
 * - 읽기 전용 모드 지원
 */
export default function CategoryBreadcrumb({
  selectedType,
  selectedParentCategory,
  selectedCategory,
  onStepClick,
  readOnly = false,
  className = '',
}: CategoryBreadcrumbProps) {
  // 빈 상태인 경우 아무것도 표시하지 않음
  if (!selectedType && !selectedParentCategory && !selectedCategory) {
    return null
  }

  const handleStepClick = (
    step: 'type' | 'parent' | 'category',
    id?: string
  ) => {
    if (readOnly || !onStepClick) return
    onStepClick(step, id)
  }

  const breadcrumbItems = []

  // 1단계: 거래 유형
  if (selectedType) {
    breadcrumbItems.push({
      key: 'type',
      label: getTypeName(selectedType),
      icon: <CategoryIcon type={selectedType} size={14} />,
      onClick: () => handleStepClick('type'),
    })
  }

  // 2단계: 대분류 카테고리
  if (selectedParentCategory) {
    breadcrumbItems.push({
      key: 'parent',
      label: selectedParentCategory.name,
      icon: (
        <CategoryNameIcon
          categoryName={selectedParentCategory.name}
          categoryType={selectedParentCategory.type}
          size={14}
        />
      ),
      onClick: () => handleStepClick('parent', selectedParentCategory.id),
    })
  }

  // 3단계: 소분류 카테고리
  if (selectedCategory) {
    breadcrumbItems.push({
      key: 'category',
      label: selectedCategory.name,
      icon: (
        <CategoryNameIcon
          categoryName={selectedCategory.name}
          categoryType={selectedCategory.type}
          size={14}
        />
      ),
      onClick: () => handleStepClick('category', selectedCategory.id),
    })
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.key}>
          {/* 구분자 */}
          {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />}

          {/* Breadcrumb 항목 */}
          {readOnly ? (
            <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-700">
              {item.icon}
              <span>{item.label}</span>
            </div>
          ) : (
            <Button
              variant="light"
              size="sm"
              className="h-auto min-w-0 p-2 text-sm font-normal text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              startContent={item.icon}
              onPress={item.onClick}
            >
              {item.label}
            </Button>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * 간단한 카테고리 경로 텍스트 표시 컴포넌트
 */
export function CategoryPath({
  selectedType,
  selectedParentCategory,
  selectedCategory,
  separator = ' > ',
  className = '',
}: {
  selectedType?: TransactionType
  selectedParentCategory?: {
    name: string
    type: TransactionType
  }
  selectedCategory?: {
    name: string
    type: TransactionType
  }
  separator?: string
  className?: string
}) {
  const pathItems = []

  if (selectedType) {
    pathItems.push(getTypeName(selectedType))
  }

  if (selectedParentCategory) {
    pathItems.push(selectedParentCategory.name)
  }

  if (selectedCategory) {
    pathItems.push(selectedCategory.name)
  }

  if (pathItems.length === 0) {
    return null
  }

  return (
    <span className={`text-sm text-gray-600 ${className}`}>
      {pathItems.join(separator)}
    </span>
  )
}
