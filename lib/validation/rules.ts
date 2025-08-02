/**
 * 재사용 가능한 validation 규칙들
 * MoneyFlow 앱의 공통 validation 로직을 함수형으로 구현
 */

import { isValidUUID, isValidUUIDv7 } from '@/lib/utils/validation'

// ============================================================================
// 기본 규칙 (Basic Rules)
// ============================================================================

/**
 * 필수 필드 검증
 */
export const required =
  (fieldName: string = '필드') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName}은(는) 필수입니다`
    }
    if (typeof value === 'string' && value.trim() === '') {
      return `${fieldName}을(를) 입력해주세요`
    }
    return null
  }

/**
 * 최소 길이 검증
 */
export const minLength =
  (min: number, fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null // required와 함께 사용
    if (value.length < min) {
      return `${fieldName}은(는) 최소 ${min}자 이상이어야 합니다`
    }
    return null
  }

/**
 * 최대 길이 검증
 */
export const maxLength =
  (max: number, fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    if (value.length > max) {
      return `${fieldName}은(는) ${max}자 이하여야 합니다`
    }
    return null
  }

/**
 * 정확한 길이 검증
 */
export const exactLength =
  (length: number, fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    if (value.length !== length) {
      return `${fieldName}은(는) 정확히 ${length}자여야 합니다`
    }
    return null
  }

/**
 * 이메일 형식 검증
 */
export const email = (value: string) => {
  if (!value) return null
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return '올바른 이메일 형식을 입력해주세요'
  }
  return null
}

/**
 * URL 형식 검증
 */
export const url = (value: string) => {
  if (!value) return null
  try {
    new URL(value)
    return null
  } catch {
    return '올바른 URL 형식을 입력해주세요'
  }
}

/**
 * 정규표현식 검증
 */
export const pattern = (regex: RegExp, message: string) => (value: string) => {
  if (!value) return null
  if (!regex.test(value)) {
    return message
  }
  return null
}

// ============================================================================
// 숫자 관련 규칙 (Number Rules)
// ============================================================================

/**
 * 숫자 형식 검증
 */
export const isNumber =
  (fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) {
      return `${fieldName}은(는) 숫자여야 합니다`
    }
    return null
  }

/**
 * 정수 검증
 */
export const isInteger =
  (fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num) || !Number.isInteger(num)) {
      return `${fieldName}은(는) 정수여야 합니다`
    }
    return null
  }

/**
 * 최솟값 검증
 */
export const min =
  (minValue: number, fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) return null // isNumber와 함께 사용
    if (num < minValue) {
      return `${fieldName}은(는) ${minValue} 이상이어야 합니다`
    }
    return null
  }

/**
 * 최댓값 검증
 */
export const max =
  (maxValue: number, fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) return null
    if (num > maxValue) {
      return `${fieldName}은(는) ${maxValue} 이하여야 합니다`
    }
    return null
  }

/**
 * 양수 검증
 */
export const positive =
  (fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) return null
    if (num <= 0) {
      return `${fieldName}은(는) 0보다 큰 양수여야 합니다`
    }
    return null
  }

/**
 * 음이 아닌 수 검증 (0 이상)
 */
export const nonNegative =
  (fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) return null
    if (num < 0) {
      return `${fieldName}은(는) 0 이상이어야 합니다`
    }
    return null
  }

/**
 * 화폐 형식 검증 (소수점 2자리까지)
 */
export const currency =
  (fieldName: string = '금액') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) {
      return `${fieldName}은(는) 올바른 숫자여야 합니다`
    }
    if (num < 0) {
      return `${fieldName}은(는) 음수일 수 없습니다`
    }
    // 소수점 2자리까지만 허용
    if (
      num.toString().includes('.') &&
      num.toString().split('.')[1].length > 2
    ) {
      return `${fieldName}은(는) 소수점 2자리까지만 입력 가능합니다`
    }
    return null
  }

/**
 * 범위 검증
 */
export const range =
  (minValue: number, maxValue: number, fieldName: string = '값') =>
  (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (isNaN(num)) return null
    if (num < minValue || num > maxValue) {
      return `${fieldName}은(는) ${minValue}와 ${maxValue} 사이의 값이어야 합니다`
    }
    return null
  }

// ============================================================================
// 문자열 관련 규칙 (String Rules)
// ============================================================================

/**
 * 영문자만 허용
 */
export const alphabetic =
  (fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    const alphaRegex = /^[a-zA-Z]+$/
    if (!alphaRegex.test(value)) {
      return `${fieldName}은(는) 영문자만 입력 가능합니다`
    }
    return null
  }

/**
 * 영문자와 숫자만 허용
 */
export const alphanumeric =
  (fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    const alphanumericRegex = /^[a-zA-Z0-9]+$/
    if (!alphanumericRegex.test(value)) {
      return `${fieldName}은(는) 영문자와 숫자만 입력 가능합니다`
    }
    return null
  }

/**
 * 한글만 허용
 */
export const korean =
  (fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    const koreanRegex = /^[가-힣\s]+$/
    if (!koreanRegex.test(value)) {
      return `${fieldName}은(는) 한글만 입력 가능합니다`
    }
    return null
  }

/**
 * 한글, 영문, 숫자만 허용
 */
export const koreanAlphanumeric =
  (fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    const koreanAlphanumericRegex = /^[가-힣a-zA-Z0-9\s]+$/
    if (!koreanAlphanumericRegex.test(value)) {
      return `${fieldName}은(는) 한글, 영문, 숫자만 입력 가능합니다`
    }
    return null
  }

/**
 * 휴대폰 번호 형식 검증
 */
export const phone = (value: string) => {
  if (!value) return null
  // 010-1234-5678, 01012345678, +82-10-1234-5678 등 다양한 형식 지원
  const phoneRegex = /^(\+82-?)?01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
  if (!phoneRegex.test(value.replace(/\s/g, ''))) {
    return '올바른 휴대폰 번호 형식을 입력해주세요 (예: 010-1234-5678)'
  }
  return null
}

/**
 * 공백 제거 후 검증
 */
export const noWhitespace =
  (fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    if (value.includes(' ')) {
      return `${fieldName}에는 공백을 포함할 수 없습니다`
    }
    return null
  }

/**
 * 특수문자 제외 검증
 */
export const noSpecialChars =
  (fieldName: string = '값') =>
  (value: string) => {
    if (!value) return null
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/
    if (specialCharsRegex.test(value)) {
      return `${fieldName}에는 특수문자를 포함할 수 없습니다`
    }
    return null
  }

// ============================================================================
// 날짜 관련 규칙 (Date Rules)
// ============================================================================

/**
 * 날짜 형식 검증
 */
export const dateFormat =
  (format: string = 'YYYY-MM-DD') =>
  (value: string) => {
    if (!value) return null
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return `올바른 날짜 형식(${format})을 입력해주세요`
    }
    return null
  }

/**
 * 과거 날짜 검증
 */
export const pastDate =
  (fieldName: string = '날짜') =>
  (value: string) => {
    if (!value) return null
    const date = new Date(value)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // 오늘 끝까지
    if (date > today) {
      return `${fieldName}은(는) 과거 또는 오늘 날짜여야 합니다`
    }
    return null
  }

/**
 * 미래 날짜 검증
 */
export const futureDate =
  (fieldName: string = '날짜') =>
  (value: string) => {
    if (!value) return null
    const date = new Date(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 오늘 시작
    if (date < today) {
      return `${fieldName}은(는) 오늘 또는 미래 날짜여야 합니다`
    }
    return null
  }

/**
 * 날짜 범위 검증
 */
export const dateRange =
  (startDate: Date, endDate: Date, fieldName: string = '날짜') =>
  (value: string) => {
    if (!value) return null
    const date = new Date(value)
    if (date < startDate || date > endDate) {
      return `${fieldName}은(는) ${startDate.toLocaleDateString('ko-KR')}와 ${endDate.toLocaleDateString('ko-KR')} 사이여야 합니다`
    }
    return null
  }

/**
 * 만 나이 검증 (주민등록번호 생년월일 기준)
 */
export const minAge = (minAgeValue: number) => (value: string) => {
  if (!value) return null
  const birthDate = new Date(value)
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age

  if (actualAge < minAgeValue) {
    return `만 ${minAgeValue}세 이상이어야 합니다`
  }
  return null
}

// ============================================================================
// 도메인 특화 규칙 (Domain-Specific Rules)
// ============================================================================

/**
 * UUID 검증
 */
export const uuid =
  (fieldName: string = 'ID') =>
  (value: string) => {
    if (!value) return null
    if (!isValidUUID(value)) {
      return `올바른 ${fieldName} 형식이 아닙니다`
    }
    return null
  }

/**
 * UUID v7 검증
 */
export const uuidv7 =
  (fieldName: string = 'ID') =>
  (value: string) => {
    if (!value) return null
    if (!isValidUUIDv7(value)) {
      return `올바른 ${fieldName} 형식이 아닙니다 (UUID v7 필요)`
    }
    return null
  }

/**
 * 계좌번호 검증 (한국 은행 계좌번호)
 */
export const accountNumber = (value: string) => {
  if (!value) return null
  // 한국 계좌번호: 숫자와 하이픈으로 구성, 4-20자리
  const accountRegex = /^[0-9\-]{6,25}$/
  if (!accountRegex.test(value)) {
    return '올바른 계좌번호 형식을 입력해주세요'
  }
  // 순수 숫자만 추출했을 때 최소 길이 체크
  const numbersOnly = value.replace(/\-/g, '')
  if (numbersOnly.length < 4 || numbersOnly.length > 20) {
    return '계좌번호는 4자리 이상 20자리 이하여야 합니다'
  }
  return null
}

/**
 * 카드번호 검증 (마지막 4자리)
 */
export const cardNumber = (value: string) => {
  if (!value) return null
  const cardRegex = /^\d{4}$/
  if (!cardRegex.test(value)) {
    return '카드 뒷 4자리는 숫자 4개여야 합니다'
  }
  return null
}

/**
 * 사업자등록번호 검증
 */
export const businessNumber = (value: string) => {
  if (!value) return null
  const businessRegex = /^\d{3}-?\d{2}-?\d{5}$/
  if (!businessRegex.test(value)) {
    return '올바른 사업자등록번호 형식을 입력해주세요 (예: 123-45-67890)'
  }
  return null
}

/**
 * 조직명 검증
 */
export const organizationName = (value: string) => {
  if (!value) return null
  if (value.length < 2) {
    return '조직명은 2자 이상이어야 합니다'
  }
  if (value.length > 100) {
    return '조직명은 100자 이하여야 합니다'
  }
  // 특수문자 제한 (일부만 허용)
  const allowedCharsRegex = /^[가-힣a-zA-Z0-9\s\.\-_\(\)]+$/
  if (!allowedCharsRegex.test(value)) {
    return '조직명에는 한글, 영문, 숫자, 공백, 괄호, 하이픈, 언더스코어, 마침표만 사용할 수 있습니다'
  }
  return null
}

/**
 * 결제수단 이름 검증
 */
export const paymentMethodName = (value: string) => {
  if (!value) return null
  if (value.length < 2) {
    return '결제수단 이름은 2자 이상이어야 합니다'
  }
  if (value.length > 50) {
    return '결제수단 이름은 50자 이하여야 합니다'
  }
  return null
}

/**
 * 거래 설명 검증
 */
export const transactionDescription = (value: string) => {
  if (!value) return null
  if (value.length > 500) {
    return '거래 설명은 500자 이하여야 합니다'
  }
  return null
}

/**
 * 거래 타입 검증
 */
export const transactionType = (value: string) => {
  if (!value) return null
  const allowedTypes = ['income', 'expense', 'transfer']
  if (!allowedTypes.includes(value)) {
    return '올바른 거래 타입을 선택해주세요'
  }
  return null
}

/**
 * 결제수단 타입 검증
 */
export const paymentMethodType = (value: string) => {
  if (!value) return null
  const allowedTypes = ['cash', 'card', 'account', 'other']
  if (!allowedTypes.includes(value)) {
    return '올바른 결제수단 타입을 선택해주세요'
  }
  return null
}

/**
 * 사용자 역할 검증
 */
export const userRole = (value: string) => {
  if (!value) return null
  const allowedRoles = ['owner', 'admin', 'member']
  if (!allowedRoles.includes(value)) {
    return '올바른 사용자 역할을 선택해주세요'
  }
  return null
}

// ============================================================================
// 규칙 조합 유틸리티
// ============================================================================

/**
 * 여러 validation 규칙을 조합하여 실행
 */
export const combine =
  (...rules: Array<(value: any) => string | null>) =>
  (value: any) => {
    for (const rule of rules) {
      const result = rule(value)
      if (result !== null) {
        return result // 첫 번째 에러를 반환
      }
    }
    return null
  }

/**
 * 조건부 validation
 */
export const when =
  (condition: (value: any) => boolean, rule: (value: any) => string | null) =>
  (value: any) => {
    if (condition(value)) {
      return rule(value)
    }
    return null
  }

/**
 * 선택적 validation (값이 있을 때만 검증)
 */
export const optional =
  (rule: (value: any) => string | null) => (value: any) => {
    if (value === null || value === undefined || value === '') {
      return null
    }
    return rule(value)
  }
