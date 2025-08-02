'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Input, type InputProps } from '@heroui/react'

export interface ValidatedInputProps
  extends Omit<InputProps, 'errorMessage' | 'isInvalid'> {
  /**
   * 유효성 검사 함수
   * @param value - 입력된 값
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
   * 값 변경 시 호출되는 콜백 (에러 상태와 함께)
   */
  onValueChangeWithValidation?: (value: string, error: string | null) => void
}

/**
 * HeroUI Input을 래핑한 validation 지원 컴포넌트
 *
 * 기능:
 * - 실시간 validation 및 에러 표시
 * - 필수 필드 시각적 표시 (*)
 * - 외부 에러 상태 지원
 * - HeroUI Input의 모든 props 상속
 */
export default function ValidatedInput({
  validation,
  error: externalError,
  realTimeValidation = true,
  onValueChangeWithValidation,
  onValueChange,
  isRequired = false,
  label,
  value = '',
  ...props
}: ValidatedInputProps) {
  const [internalError, setInternalError] = useState<string | null>(null)
  const [hasBlurred, setHasBlurred] = useState(false)

  // 현재 에러 상태 (외부 에러가 우선)
  const currentError = useMemo(() => {
    return externalError || internalError
  }, [externalError, internalError])

  // validation 실행
  const validateValue = useCallback(
    (inputValue: string): string | null => {
      if (!validation) return null
      return validation(inputValue)
    },
    [validation]
  )

  // 값 변경 핸들러
  const handleValueChange = useCallback(
    (newValue: string) => {
      // 외부 onValueChange 호출
      onValueChange?.(newValue)

      // 실시간 validation 또는 blur 후에만 validation 실행
      if (realTimeValidation || hasBlurred) {
        const validationError = validateValue(newValue)
        setInternalError(validationError)

        // validation 결과와 함께 콜백 호출
        onValueChangeWithValidation?.(newValue, validationError)
      } else {
        // 실시간 validation이 비활성화된 경우에도 콜백은 호출
        onValueChangeWithValidation?.(newValue, null)
      }

      // 외부 에러가 있는 경우 입력 시 클리어
      if (externalError && newValue !== value) {
        // 외부 에러는 부모 컴포넌트에서 관리하므로 여기서는 내부 에러만 클리어
        setInternalError(null)
      }
    },
    [
      onValueChange,
      onValueChangeWithValidation,
      realTimeValidation,
      hasBlurred,
      validateValue,
      externalError,
      value,
    ]
  )

  // blur 핸들러
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setHasBlurred(true)

      // blur 시 validation 실행 (실시간 validation이 비활성화된 경우)
      if (!realTimeValidation) {
        const validationError = validateValue(e.target.value)
        setInternalError(validationError)
        onValueChangeWithValidation?.(e.target.value, validationError)
      }

      // 원래 onBlur 호출
      props.onBlur?.(e)
    },
    [
      realTimeValidation,
      validateValue,
      onValueChangeWithValidation,
      props.onBlur,
    ]
  )

  // focus 핸들러 (에러 클리어)
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // focus 시 내부 에러 클리어 (외부 에러는 유지)
      if (internalError && !externalError) {
        setInternalError(null)
      }

      // 원래 onFocus 호출
      props.onFocus?.(e)
    },
    [internalError, externalError, props.onFocus]
  )

  // 필수 필드 라벨 처리
  const processedLabel = useMemo(() => {
    if (!label) return label
    if (isRequired && typeof label === 'string' && !label.includes('*')) {
      return `${label} *`
    }
    return label
  }, [label, isRequired])

  return (
    <Input
      {...props}
      label={processedLabel}
      value={value}
      onValueChange={handleValueChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      errorMessage={currentError}
      isInvalid={!!currentError}
      isRequired={isRequired}
      // 필수 필드 스타일링
      classNames={{
        label: isRequired
          ? 'text-foreground after:content-["*"] after:text-danger after:ml-0.5'
          : undefined,
        ...props.classNames,
      }}
    />
  )
}

// 일반적인 validation 함수들을 export
export const validationRules = {
  /**
   * 필수 입력 검사
   */
  required:
    (fieldName: string = '필드') =>
    (value: string) => {
      return value.trim() === '' ? `${fieldName}을(를) 입력해주세요` : null
    },

  /**
   * 최소 길이 검사
   */
  minLength:
    (min: number, fieldName: string = '값') =>
    (value: string) => {
      return value.length < min
        ? `${fieldName}은(는) 최소 ${min}자 이상 입력해주세요`
        : null
    },

  /**
   * 최대 길이 검사
   */
  maxLength:
    (max: number, fieldName: string = '값') =>
    (value: string) => {
      return value.length > max
        ? `${fieldName}은(는) 최대 ${max}자까지 입력 가능합니다`
        : null
    },

  /**
   * 이메일 형식 검사
   */
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return !emailRegex.test(value) ? '올바른 이메일 형식을 입력해주세요' : null
  },

  /**
   * 숫자만 허용
   */
  numeric: (value: string) => {
    const numericRegex = /^\d+$/
    return !numericRegex.test(value) ? '숫자만 입력 가능합니다' : null
  },

  /**
   * 정규식 검사
   */
  pattern: (regex: RegExp, message: string) => (value: string) => {
    return !regex.test(value) ? message : null
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
