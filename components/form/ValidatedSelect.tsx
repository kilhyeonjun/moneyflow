'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Select,
  SelectItem,
  type SelectProps,
  type Selection,
} from '@heroui/react'

export interface SelectOption {
  key: string
  label: string
  value?: string
  startContent?: React.ReactNode
  endContent?: React.ReactNode
  description?: string
  isDisabled?: boolean
}

export interface ValidatedSelectProps
  extends Omit<SelectProps, 'errorMessage' | 'isInvalid' | 'children'> {
  /**
   * 선택 옵션 리스트
   */
  options: SelectOption[]

  /**
   * 유효성 검사 함수
   * @param value - 선택된 값 (key)
   * @returns 에러 메시지 또는 null (유효한 경우)
   */
  validation?: (value: string) => string | null

  /**
   * 외부에서 전달되는 에러 상태
   */
  error?: string

  /**
   * 실시간 유효성 검사 활성화 여부 (기본값: true)
   */
  realTimeValidation?: boolean

  /**
   * 선택 변경 시 호출되는 콜백 (에러 상태와 함께)
   */
  onSelectionChangeWithValidation?: (
    keys: Set<string>,
    error: string | null
  ) => void

  /**
   * 빈 선택지 표시 여부 (기본값: false)
   */
  showEmptyOption?: boolean

  /**
   * 빈 선택지 라벨 (기본값: "선택해주세요")
   */
  emptyOptionLabel?: string
}

/**
 * HeroUI Select를 래핑한 validation 지원 컴포넌트
 *
 * 기능:
 * - 실시간 validation 및 에러 표시
 * - 필수 필드 시각적 표시 (*)
 * - 외부 에러 상태 지원
 * - 옵션 리스트 지원
 * - HeroUI Select의 모든 props 상속
 */
export default function ValidatedSelect({
  options,
  validation,
  error: externalError,
  realTimeValidation = true,
  onSelectionChangeWithValidation,
  onSelectionChange,
  showEmptyOption = false,
  emptyOptionLabel = '선택해주세요',
  isRequired = false,
  label,
  selectedKeys,
  ...props
}: ValidatedSelectProps) {
  const [internalError, setInternalError] = useState<string | null>(null)
  const [hasChanged, setHasChanged] = useState(false)

  // 현재 에러 상태 (외부 에러가 우선)
  const currentError = useMemo(() => {
    return externalError || internalError
  }, [externalError, internalError])

  // validation 실행
  const validateValue = useCallback(
    (keys: Set<string>): string | null => {
      if (!validation) return null

      // 단일 선택의 경우 첫 번째 key 사용, 다중 선택의 경우 join
      const value = Array.from(keys)[0] || ''
      return validation(value)
    },
    [validation]
  )

  // 선택 변경 핸들러
  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      const keySet = new Set(Array.from(keys).map(key => String(key)))
      setHasChanged(true)

      // 외부 onSelectionChange 호출
      onSelectionChange?.(keys)

      // 실시간 validation 또는 이미 변경된 경우에만 validation 실행
      if (realTimeValidation || hasChanged) {
        const validationError = validateValue(keySet)
        setInternalError(validationError)

        // validation 결과와 함께 콜백 호출
        onSelectionChangeWithValidation?.(keySet, validationError)
      } else {
        // 실시간 validation이 비활성화된 경우에도 콜백은 호출
        onSelectionChangeWithValidation?.(keySet, null)
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

  // 처리된 옵션 리스트 (빈 선택지 포함)
  const processedOptions = useMemo(() => {
    const allOptions = [...options]

    if (showEmptyOption) {
      allOptions.unshift({
        key: '',
        label: emptyOptionLabel,
        value: '',
        isDisabled: false,
      })
    }

    return allOptions
  }, [options, showEmptyOption, emptyOptionLabel])

  // 필수 필드 라벨 처리 (CSS로 별표를 처리하므로 여기서는 원본 라벨 사용)
  const processedLabel = useMemo(() => {
    return label
  }, [label])

  // renderValue 처리
  const defaultRenderValue = useCallback(
    (items: any[]) => {
      return items.map(item => {
        const option = processedOptions.find(opt => opt.key === item.key)
        return (
          <div key={item.key} className="flex items-center gap-2">
            {option?.startContent}
            <span>{option?.label || item.textValue}</span>
          </div>
        )
      })
    },
    [processedOptions]
  )

  return (
    <Select
      {...props}
      label={processedLabel}
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      errorMessage={currentError}
      isInvalid={!!currentError}
      isRequired={isRequired}
      renderValue={props.renderValue || defaultRenderValue}
      // 필수 필드 스타일링
      classNames={{
        label: isRequired
          ? 'text-foreground after:content-["*"] after:text-danger after:ml-0.5'
          : undefined,
        ...props.classNames,
      }}
    >
      {processedOptions.map(option => (
        <SelectItem
          key={option.key}
          startContent={option.startContent}
          endContent={option.endContent}
          description={option.description}
          isDisabled={option.isDisabled}
        >
          {option.label}
        </SelectItem>
      ))}
    </Select>
  )
}

// 일반적인 Select validation 함수들을 export
export const selectValidationRules = {
  /**
   * 필수 선택 검사
   */
  required:
    (fieldName: string = '항목') =>
    (value: string) => {
      return !value || value === '' ? `${fieldName}을(를) 선택해주세요` : null
    },

  /**
   * 특정 값들 중 하나인지 검사
   */
  oneOf:
    (allowedValues: string[], fieldName: string = '값') =>
    (value: string) => {
      return !allowedValues.includes(value)
        ? `올바른 ${fieldName}을(를) 선택해주세요`
        : null
    },

  /**
   * 특정 값들 제외 검사
   */
  notOneOf: (forbiddenValues: string[], message: string) => (value: string) => {
    return forbiddenValues.includes(value) ? message : null
  },

  /**
   * 여러 validation 조합
   */
  combine:
    (...validations: Array<(value: string) => string | null>) =>
    (value: string) => {
      for (const validation of validations) {
        const error = validation(value)
        if (error) return error
      }
      return null
    },
}
