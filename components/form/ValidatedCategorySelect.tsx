'use client'

import React, { useState, useCallback, useMemo } from 'react'
import HierarchicalCategorySelect from '../categories/HierarchicalCategorySelect'

interface CategoryData {
  id: string
  name: string
  type: 'income' | 'savings' | 'fixed_expense' | 'variable_expense'
  parentId: string | null
  displayOrder: number | null
  isActive: boolean
  parent: {
    id: string
    name: string
    type: 'income' | 'savings' | 'fixed_expense' | 'variable_expense'
  } | null
  children: {
    id: string
    name: string
    type: 'income' | 'savings' | 'fixed_expense' | 'variable_expense'
    displayOrder: number | null
    isActive: boolean
  }[]
  transactionCount: number
}

export interface ValidatedCategorySelectProps {
  /**
   * 조직 ID
   */
  organizationId: string

  /**
   * 선택된 카테고리 ID
   */
  value?: string

  /**
   * 선택 변경 시 호출되는 콜백
   */
  onSelectionChange: (categoryId: string | undefined) => void

  /**
   * 유효성 검사 함수
   * @param value - 선택된 카테고리 ID
   * @returns 에러 메시지 또는 null (유효한 경우)
   */
  validation?: (value: string | undefined) => string | null

  /**
   * 외부에서 전달되는 에러 상태
   */
  error?: string

  /**
   * 실시간 유효성 검사 활성화 여부 (기본값: true)
   */
  realTimeValidation?: boolean

  /**
   * 값 변경 시 호출되는 콜백 (에러 상태와 함께)
   */
  onSelectionChangeWithValidation?: (
    categoryId: string | undefined,
    error: string | null,
    categoryData?: CategoryData
  ) => void

  /**
   * 라벨
   */
  label?: string

  /**
   * 플레이스홀더
   */
  placeholder?: string

  /**
   * 필수 필드 여부
   */
  isRequired?: boolean

  /**
   * 크기
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * 변형
   */
  variant?:
    | 'flat'
    | 'bordered'
    | 'faded'
    | 'light'
    | 'solid'
    | 'shadow'
    | 'ghost'

  /**
   * 선택 없음 옵션 포함 여부
   */
  includeNoneOption?: boolean

  /**
   * 선택 없음 옵션 라벨
   */
  noneOptionLabel?: string

  /**
   * 읽기 전용 모드
   */
  readOnly?: boolean

  /**
   * 비활성화 상태
   */
  isDisabled?: boolean
}

/**
 * ValidatedInput 패턴을 따르는 계층형 카테고리 선택 컴포넌트
 *
 * 기능:
 * - 실시간 validation 및 에러 표시
 * - 필수 필드 시각적 표시 (*)
 * - 외부 에러 상태 지원
 * - HierarchicalCategorySelect의 모든 기능 상속
 */
export default function ValidatedCategorySelect({
  organizationId,
  value,
  onSelectionChange,
  validation,
  error: externalError,
  realTimeValidation = true,
  onSelectionChangeWithValidation,
  label = '카테고리',
  placeholder = '카테고리를 선택하세요',
  isRequired = false,
  size = 'md',
  variant = 'flat',
  includeNoneOption = true,
  noneOptionLabel = '카테고리 없음',
  readOnly = false,
  isDisabled = false,
}: ValidatedCategorySelectProps) {
  const [internalError, setInternalError] = useState<string | null>(null)
  const [hasChanged, setHasChanged] = useState(false)

  // 현재 에러 상태 (외부 에러가 우선)
  const currentError = useMemo(() => {
    return externalError || internalError
  }, [externalError, internalError])

  // validation 실행
  const validateValue = useCallback(
    (categoryId: string | undefined): string | null => {
      if (!validation) return null
      return validation(categoryId)
    },
    [validation]
  )

  // 선택 변경 핸들러
  const handleSelectionChange = useCallback(
    (categoryId: string | undefined, categoryData?: CategoryData) => {
      setHasChanged(true)

      // 외부 onSelectionChange 호출
      onSelectionChange(categoryId)

      // 실시간 validation 또는 이미 변경된 경우에만 validation 실행
      if (realTimeValidation || hasChanged) {
        const validationError = validateValue(categoryId)
        setInternalError(validationError)

        // validation 결과와 함께 콜백 호출
        onSelectionChangeWithValidation?.(
          categoryId,
          validationError,
          categoryData
        )
      } else {
        // 실시간 validation이 비활성화된 경우에도 콜백은 호출
        onSelectionChangeWithValidation?.(categoryId, null, categoryData)
      }

      // 외부 에러가 있는 경우 선택 시 내부 에러 클리어
      if (externalError) {
        setInternalError(null)
      }
    },
    [
      onSelectionChange,
      onSelectionChangeWithValidation,
      realTimeValidation,
      hasChanged,
      validateValue,
      externalError,
    ]
  )

  return (
    <HierarchicalCategorySelect
      organizationId={organizationId}
      value={value}
      onSelectionChange={handleSelectionChange}
      label={label}
      placeholder={placeholder}
      isRequired={isRequired}
      isInvalid={!!currentError}
      errorMessage={currentError || undefined}
      size={size}
      variant={variant}
      includeNoneOption={includeNoneOption}
      noneOptionLabel={noneOptionLabel}
      readOnly={readOnly}
      isDisabled={isDisabled}
    />
  )
}

// 일반적인 카테고리 validation 함수들을 export
export const categoryValidationRules = {
  /**
   * 필수 선택 검사
   */
  required:
    (fieldName: string = '카테고리') =>
    (value: string | undefined) => {
      return !value ? `${fieldName}을(를) 선택해주세요` : null
    },

  /**
   * 특정 거래 유형만 허용하는 검사
   */
  allowedTypes:
    (
      allowedTypes: (
        | 'income'
        | 'savings'
        | 'fixed_expense'
        | 'variable_expense'
      )[],
      fieldName: string = '카테고리'
    ) =>
    (value: string | undefined, categoryData?: CategoryData) => {
      if (!value || !categoryData) return null

      if (!allowedTypes.includes(categoryData.type)) {
        const typeNames = {
          income: '수입',
          savings: '저축',
          fixed_expense: '고정 지출',
          variable_expense: '변동 지출',
        }

        const allowedTypeNames = allowedTypes
          .map(type => typeNames[type])
          .join(', ')
        return `${allowedTypeNames} 카테고리만 선택할 수 있습니다`
      }

      return null
    },

  /**
   * 대분류만 허용하는 검사 (소분류 선택 불가)
   */
  parentOnly:
    (fieldName: string = '카테고리') =>
    (value: string | undefined, categoryData?: CategoryData) => {
      if (!value || !categoryData) return null

      if (categoryData.parentId) {
        return `대분류 ${fieldName}만 선택할 수 있습니다`
      }

      return null
    },

  /**
   * 소분류만 허용하는 검사 (대분류 선택 불가)
   */
  childOnly:
    (fieldName: string = '카테고리') =>
    (value: string | undefined, categoryData?: CategoryData) => {
      if (!value || !categoryData) return null

      if (!categoryData.parentId) {
        return `세부 ${fieldName}을(를) 선택해주세요`
      }

      return null
    },

  /**
   * 여러 validation 조합
   */
  combine:
    (
      ...validations: Array<
        (
          value: string | undefined,
          categoryData?: CategoryData
        ) => string | null
      >
    ) =>
    (value: string | undefined, categoryData?: CategoryData) => {
      for (const validation of validations) {
        const error = validation(value, categoryData)
        if (error) return error
      }
      return null
    },
}
