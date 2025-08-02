'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

/**
 * 필드별 validation 규칙 정의
 */
export type FieldValidation<T> = {
  [K in keyof T]?: (value: any) => string | null
}

/**
 * Form validation 상태
 */
export interface FormValidationState<T> {
  errors: Partial<Record<keyof T, string>>
  isValid: boolean
  hasErrors: boolean
  touchedFields: Set<keyof T>
}

/**
 * Form validation 결과
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * useFormValidation 훅의 옵션
 */
export interface UseFormValidationOptions<T> {
  /**
   * 초기 데이터
   */
  initialData?: Partial<T>

  /**
   * 실시간 validation 활성화 여부 (기본값: true)
   */
  realTimeValidation?: boolean

  /**
   * validation 모드
   * - 'onChange': 값 변경 시마다 validation
   * - 'onBlur': focus를 잃을 때 validation
   * - 'onSubmit': 제출 시에만 validation
   */
  mode?: 'onChange' | 'onBlur' | 'onSubmit'

  /**
   * 에러 발생 시 자동으로 해당 필드에 focus 할지 여부
   */
  focusOnError?: boolean
}

/**
 * Form validation을 위한 커스텀 훅
 *
 * 기능:
 * - 제네릭 타입으로 form data 구조 지원
 * - 필드별 validation 규칙 정의
 * - 실시간 validation 실행
 * - 전체 form validation 상태 관리
 * - TanStack Form과 호환 가능한 구조
 */
export function useFormValidation<T extends Record<string, any>>(
  validationRules: FieldValidation<T>,
  options: UseFormValidationOptions<T> = {}
) {
  const {
    initialData = {},
    realTimeValidation = true,
    mode = 'onChange',
    focusOnError = false,
  } = options

  // Store initial data in a ref to avoid recreating callbacks
  const initialDataRef = useRef(initialData)

  // Update ref when initial data changes
  useEffect(() => {
    initialDataRef.current = initialData
  }, [initialData])

  // 상태 관리
  const [data, setData] = useState<T>(initialData as T)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touchedFields, setTouchedFields] = useState<Set<keyof T>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // validation 상태 계산
  const validationState = useMemo<FormValidationState<T>>(() => {
    // undefined 값들을 제거한 실제 에러만 계산
    const actualErrors = Object.entries(errors).filter(
      ([_, error]) => error != null
    )
    const hasErrors = actualErrors.length > 0

    // 올바른 isValid 계산: 모든 필드가 유효해야 함
    const isValid =
      !hasErrors &&
      Object.keys(validationRules).every(fieldName => {
        const key = fieldName as keyof T
        const validator = validationRules[key]
        if (!validator) return true

        const currentValue = data[key]
        const error = validator(currentValue)
        return error === null
      })

    return {
      errors,
      isValid,
      hasErrors,
      touchedFields,
    }
  }, [errors, touchedFields, data, validationRules])

  // 단일 필드 validation
  const validateField = useCallback(
    (
      fieldName: keyof T,
      value: any,
      showError: boolean = true
    ): string | null => {
      const validator = validationRules[fieldName]
      if (!validator) return null

      const error = validator(value)

      if (showError) {
        setErrors(prev => {
          const newErrors = { ...prev }
          if (error) {
            newErrors[fieldName] = error
          } else {
            delete newErrors[fieldName]
          }
          return newErrors
        })
      }

      return error
    },
    [validationRules]
  )

  // 전체 form validation
  const validateAll = useCallback(
    (formData: T = data, showErrors: boolean = true): ValidationResult => {
      const newErrors: Record<string, string> = {}
      let isValid = true

      // 모든 필드에 대해 validation 실행
      Object.keys(validationRules).forEach(fieldName => {
        const key = fieldName as keyof T
        const validator = validationRules[key]

        if (validator) {
          const error = validator(formData[key])
          if (error) {
            newErrors[fieldName] = error
            isValid = false
          }
        }
      })

      if (showErrors) {
        setErrors(newErrors as Partial<Record<keyof T, string>>)

        // 첫 번째 에러 필드에 focus (옵션 활성화 시)
        if (!isValid && focusOnError) {
          const firstErrorField = Object.keys(newErrors)[0]
          if (firstErrorField) {
            // DOM 요소 찾아서 focus
            setTimeout(() => {
              const element = document.querySelector(
                `[name="${firstErrorField}"], [data-field="${firstErrorField}"]`
              )
              if (element && 'focus' in element) {
                ;(element as HTMLElement).focus()
              }
            }, 0)
          }
        }
      }

      return { isValid, errors: newErrors }
    },
    [data, validationRules, focusOnError]
  )

  // 필드 값 업데이트
  const updateField = useCallback(
    (fieldName: keyof T, value: any) => {
      setData(prev => ({ ...prev, [fieldName]: value }))

      // touched 필드 추가
      setTouchedFields(prev => new Set(prev).add(fieldName))

      // 실시간 validation (모드에 따라)
      if (realTimeValidation && mode === 'onChange') {
        validateField(fieldName, value)
      }
    },
    [realTimeValidation, mode, validateField]
  )

  // 필드 blur 처리
  const blurField = useCallback(
    (fieldName: keyof T) => {
      setTouchedFields(prev => new Set(prev).add(fieldName))

      if (mode === 'onBlur') {
        validateField(fieldName, data[fieldName])
      }
    },
    [mode, validateField, data]
  )

  // 특정 필드 에러 클리어
  const clearFieldError = useCallback((fieldName: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  // 모든 에러 클리어
  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  // form 리셋 - Remove initialData from dependencies
  const reset = useCallback((newData?: Partial<T>) => {
    const resetData = newData || initialDataRef.current
    setData(resetData as T)
    setErrors({})
    setTouchedFields(new Set())
    setIsSubmitting(false)
  }, []) // Remove initialData dependency

  // form 제출 처리
  const handleSubmit = useCallback(
    async (
      onSubmit: (data: T) => Promise<void> | void,
      onError?: (errors: Record<string, string>) => void
    ) => {
      setIsSubmitting(true)

      try {
        // 제출 시 전체 validation
        const { isValid, errors: validationErrors } = validateAll(data, true)

        if (!isValid) {
          onError?.(validationErrors)
          return false
        }

        await onSubmit(data)
        return true
      } catch (error) {
        console.error('Form submission error:', error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [data, validateAll]
  )

  // TanStack Form 호환 헬퍼
  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      value: data[fieldName] || '',
      error: errors[fieldName],
      onValueChange: (value: any) => updateField(fieldName, value),
      onBlur: () => blurField(fieldName),
      validation: validationRules[fieldName],
    }),
    [data, errors, updateField, blurField, validationRules]
  )

  // 필드별 에러 상태 확인
  const hasFieldError = useCallback(
    (fieldName: keyof T): boolean => {
      return !!errors[fieldName]
    },
    [errors]
  )

  // 필드가 touched 되었는지 확인
  const isFieldTouched = useCallback(
    (fieldName: keyof T): boolean => {
      return touchedFields.has(fieldName)
    },
    [touchedFields]
  )

  return {
    // 데이터와 상태
    data,
    setData,
    validationState,
    isSubmitting,

    // validation 메서드
    validateField,
    validateAll,

    // 필드 관리
    updateField,
    blurField,
    getFieldProps,

    // 에러 관리
    clearFieldError,
    clearAllErrors,
    hasFieldError,

    // 기타 유틸리티
    reset,
    handleSubmit,
    isFieldTouched,

    // 개별 속성들 (편의성)
    errors: validationState.errors,
    isValid: validationState.isValid,
    hasErrors: validationState.hasErrors,
    touchedFields: validationState.touchedFields,
  }
}

/**
 * 일반적인 validation 규칙들
 */
export const commonValidationRules = {
  /**
   * 필수 입력 검사
   */
  required:
    (fieldName: string = '필드') =>
    (value: any) => {
      if (value === null || value === undefined) {
        return `${fieldName}을(를) 입력해주세요`
      }
      if (typeof value === 'string' && value.trim() === '') {
        return `${fieldName}을(를) 입력해주세요`
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${fieldName}을(를) 선택해주세요`
      }
      return null
    },

  /**
   * 문자열 길이 검사
   */
  stringLength:
    (min?: number, max?: number, fieldName: string = '값') =>
    (value: string) => {
      if (typeof value !== 'string') return null

      if (min !== undefined && value.length < min) {
        return `${fieldName}은(는) 최소 ${min}자 이상 입력해주세요`
      }
      if (max !== undefined && value.length > max) {
        return `${fieldName}은(는) 최대 ${max}자까지 입력 가능합니다`
      }
      return null
    },

  /**
   * 숫자 범위 검사
   */
  numberRange:
    (min?: number, max?: number, fieldName: string = '값') =>
    (value: number) => {
      if (typeof value !== 'number' || isNaN(value)) {
        return `${fieldName}은(는) 유효한 숫자여야 합니다`
      }

      if (min !== undefined && value < min) {
        return `${fieldName}은(는) ${min} 이상이어야 합니다`
      }
      if (max !== undefined && value > max) {
        return `${fieldName}은(는) ${max} 이하여야 합니다`
      }
      return null
    },

  /**
   * 이메일 형식 검사
   */
  email: (value: string) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return !emailRegex.test(value) ? '올바른 이메일 형식을 입력해주세요' : null
  },

  /**
   * 정규식 패턴 검사
   */
  pattern: (regex: RegExp, message: string) => (value: string) => {
    if (!value) return null
    return !regex.test(value) ? message : null
  },

  /**
   * 여러 validation 조합
   */
  combine:
    (...validations: Array<(value: any) => string | null>) =>
    (value: any) => {
      for (const validation of validations) {
        const error = validation(value)
        if (error) return error
      }
      return null
    },
}
