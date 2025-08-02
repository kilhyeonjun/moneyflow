/**
 * MoneyFlow 앱의 도메인별 validation 스키마 정의
 * Zod 기반의 타입 안전한 validation 스키마
 */

import { z } from 'zod'

// ============================================================================
// 기본 스키마 (Base Schemas)
// ============================================================================

/**
 * UUID 스키마
 */
export const uuidSchema = z.string().uuid('올바른 ID 형식이 아닙니다')

/**
 * 이메일 스키마
 */
export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('올바른 이메일 형식을 입력해주세요')
  .max(255, '이메일은 255자 이하여야 합니다')

/**
 * 한국 휴대폰 번호 스키마
 */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+82-?)?01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
    '올바른 휴대폰 번호 형식을 입력해주세요 (예: 010-1234-5678)'
  )

/**
 * 날짜 문자열 스키마
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)')
  .refine(date => {
    const d = new Date(date)
    return !isNaN(d.getTime())
  }, '유효한 날짜를 입력해주세요')

/**
 * 과거 날짜 스키마
 */
export const pastDateSchema = dateStringSchema.refine(date => {
  const d = new Date(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return d <= today
}, '과거 또는 오늘 날짜를 입력해주세요')

/**
 * 화폐 금액 스키마
 */
export const currencySchema = z
  .number()
  .min(0, '금액은 0 이상이어야 합니다')
  .max(999999999999.99, '금액이 너무 큽니다')
  .multipleOf(0.01, '소수점 2자리까지만 입력 가능합니다')

/**
 * 문자열 화폐 금액 스키마 (입력값 변환용)
 */
export const currencyStringSchema = z
  .string()
  .min(1, '금액을 입력해주세요')
  .regex(/^\d+(\.\d{1,2})?$/, '올바른 금액 형식을 입력해주세요')
  .transform(val => parseFloat(val))
  .pipe(currencySchema)

// ============================================================================
// 거래 (Transaction) 스키마
// ============================================================================

/**
 * 거래 타입 스키마
 */
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer'], {
  errorMap: () => ({ message: '올바른 거래 타입을 선택해주세요' }),
})

/**
 * 거래 생성 스키마
 */
export const transactionCreateSchema = z.object({
  organizationId: uuidSchema,
  amount: currencySchema,
  description: z
    .string()
    .min(1, '거래 설명을 입력해주세요')
    .max(500, '거래 설명은 500자 이하여야 합니다')
    .trim(),
  transactionDate: pastDateSchema,
  transactionType: transactionTypeSchema,
  categoryId: uuidSchema.optional(),
  paymentMethodId: uuidSchema.optional(),
  tags: z
    .array(z.string().max(50))
    .max(10, '태그는 최대 10개까지 가능합니다')
    .optional(),
  memo: z.string().max(1000, '메모는 1000자 이하여야 합니다').optional(),
  receiptUrl: z.string().url('올바른 URL 형식을 입력해주세요').optional(),
})

/**
 * 거래 생성 폼 스키마 (문자열 입력 처리)
 */
export const transactionCreateFormSchema = z.object({
  organizationId: uuidSchema,
  amount: currencyStringSchema,
  description: z
    .string()
    .min(1, '거래 설명을 입력해주세요')
    .max(500, '거래 설명은 500자 이하여야 합니다')
    .trim(),
  transactionDate: pastDateSchema,
  transactionType: transactionTypeSchema,
  categoryId: z
    .string()
    .optional()
    .transform(val => (val === '' ? undefined : val)),
  paymentMethodId: z
    .string()
    .optional()
    .transform(val => (val === '' ? undefined : val)),
  tags: z
    .string()
    .optional()
    .transform(val =>
      val
        ? val
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        : undefined
    ),
  memo: z.string().max(1000, '메모는 1000자 이하여야 합니다').optional(),
  receiptUrl: z
    .string()
    .url('올바른 URL 형식을 입력해주세요')
    .optional()
    .or(z.literal('')),
})

/**
 * 거래 수정 스키마
 */
export const transactionUpdateSchema = transactionCreateSchema
  .partial()
  .extend({
    id: uuidSchema,
  })

/**
 * 거래 수정 폼 스키마
 */
export const transactionUpdateFormSchema = transactionCreateFormSchema
  .partial()
  .extend({
    id: uuidSchema,
  })

/**
 * 거래 조회 필터 스키마
 */
export const transactionFilterSchema = z
  .object({
    organizationId: uuidSchema,
    transactionType: transactionTypeSchema.optional(),
    categoryId: uuidSchema.optional(),
    categoryType: z
      .enum(['income', 'savings', 'fixed_expense', 'variable_expense'])
      .optional(),
    paymentMethodId: uuidSchema.optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    minAmount: currencySchema.optional(),
    maxAmount: currencySchema.optional(),
    search: z.string().max(100, '검색어는 100자 이하여야 합니다').optional(),
    tags: z.array(z.string().max(50)).optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate)
      }
      return true
    },
    {
      message: '시작 날짜는 종료 날짜보다 이전이어야 합니다',
      path: ['endDate'],
    }
  )
  .refine(
    data => {
      if (data.minAmount !== undefined && data.maxAmount !== undefined) {
        return data.minAmount <= data.maxAmount
      }
      return true
    },
    {
      message: '최소 금액은 최대 금액보다 작거나 같아야 합니다',
      path: ['maxAmount'],
    }
  )

// ============================================================================
// 결제수단 (PaymentMethod) 스키마
// ============================================================================

/**
 * 결제수단 타입 스키마
 */
export const paymentMethodTypeSchema = z.enum(
  ['cash', 'card', 'account', 'other'],
  {
    errorMap: () => ({ message: '올바른 결제수단 타입을 선택해주세요' }),
  }
)

/**
 * 결제수단 생성 기본 스키마
 */
export const paymentMethodBaseSchema = z.object({
  organizationId: uuidSchema,
  name: z
    .string()
    .min(1, '결제수단 이름을 입력해주세요')
    .min(2, '결제수단 이름은 2자 이상이어야 합니다')
    .max(50, '결제수단 이름은 50자 이하여야 합니다')
    .trim(),
  type: paymentMethodTypeSchema,
})

/**
 * 현금 결제수단 스키마
 */
export const cashPaymentMethodSchema = paymentMethodBaseSchema.extend({
  type: z.literal('cash'),
  bankName: z.undefined(),
  accountNumber: z.undefined(),
  cardCompany: z.undefined(),
  lastFourDigits: z.undefined(),
})

/**
 * 카드 결제수단 스키마
 */
export const cardPaymentMethodSchema = paymentMethodBaseSchema.extend({
  type: z.literal('card'),
  cardCompany: z
    .string()
    .max(100, '카드사명은 100자 이하여야 합니다')
    .optional(),
  lastFourDigits: z
    .string()
    .regex(/^\d{4}$/, '카드 뒷 4자리는 숫자 4개여야 합니다')
    .optional(),
  bankName: z.undefined(),
  accountNumber: z.undefined(),
})

/**
 * 계좌 결제수단 스키마
 */
export const accountPaymentMethodSchema = paymentMethodBaseSchema.extend({
  type: z.literal('account'),
  bankName: z.string().max(100, '은행명은 100자 이하여야 합니다').optional(),
  accountNumber: z
    .string()
    .min(4, '계좌번호는 최소 4자리 이상이어야 합니다')
    .max(25, '계좌번호는 25자 이하여야 합니다')
    .regex(/^[0-9\-]+$/, '계좌번호는 숫자와 하이픈만 입력 가능합니다')
    .optional(),
  cardCompany: z.undefined(),
  lastFourDigits: z.undefined(),
})

/**
 * 기타 결제수단 스키마
 */
export const otherPaymentMethodSchema = paymentMethodBaseSchema.extend({
  type: z.literal('other'),
  bankName: z.undefined(),
  accountNumber: z.undefined(),
  cardCompany: z.undefined(),
  lastFourDigits: z.undefined(),
})

/**
 * 결제수단 생성 통합 스키마
 */
export const paymentMethodCreateSchema = z.discriminatedUnion('type', [
  cashPaymentMethodSchema,
  cardPaymentMethodSchema,
  accountPaymentMethodSchema,
  otherPaymentMethodSchema,
])

/**
 * 결제수단 수정 스키마
 */
export const paymentMethodUpdateSchema = z.discriminatedUnion('type', [
  cashPaymentMethodSchema.extend({ id: uuidSchema }),
  cardPaymentMethodSchema.extend({ id: uuidSchema }),
  accountPaymentMethodSchema.extend({ id: uuidSchema }),
  otherPaymentMethodSchema.extend({ id: uuidSchema }),
])

/**
 * 결제수단 폼 스키마 (유연한 입력 처리)
 */
export const paymentMethodFormSchema = z
  .object({
    organizationId: uuidSchema,
    name: z
      .string()
      .min(1, '결제수단 이름을 입력해주세요')
      .min(2, '결제수단 이름은 2자 이상이어야 합니다')
      .max(50, '결제수단 이름은 50자 이하여야 합니다')
      .trim(),
    type: paymentMethodTypeSchema,
    bankName: z
      .string()
      .max(100, '은행명은 100자 이하여야 합니다')
      .optional()
      .or(z.literal('')),
    accountNumber: z
      .string()
      .max(25, '계좌번호는 25자 이하여야 합니다')
      .optional()
      .or(z.literal('')),
    cardCompany: z
      .string()
      .max(100, '카드사명은 100자 이하여야 합니다')
      .optional()
      .or(z.literal('')),
    lastFourDigits: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // 타입별 조건부 검증
    if (
      data.type === 'card' &&
      data.lastFourDigits &&
      data.lastFourDigits !== ''
    ) {
      if (!/^\d{4}$/.test(data.lastFourDigits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '카드 뒷 4자리는 숫자 4개여야 합니다',
          path: ['lastFourDigits'],
        })
      }
    }

    if (
      data.type === 'account' &&
      data.accountNumber &&
      data.accountNumber !== ''
    ) {
      if (data.accountNumber.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '계좌번호는 최소 4자리 이상이어야 합니다',
          path: ['accountNumber'],
        })
      }
      if (!/^[0-9\-]+$/.test(data.accountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '계좌번호는 숫자와 하이픈만 입력 가능합니다',
          path: ['accountNumber'],
        })
      }
    }
  })

// ============================================================================
// 카테고리 (Category) 스키마
// ============================================================================

/**
 * 카테고리 타입 스키마
 */
export const categoryTypeSchema = z.enum(
  ['income', 'savings', 'fixed_expense', 'variable_expense'],
  {
    errorMap: () => ({ message: '올바른 카테고리 타입을 선택해주세요' }),
  }
)

/**
 * 카테고리 생성 스키마
 */
export const categoryCreateSchema = z.object({
  organizationId: uuidSchema,
  name: z
    .string()
    .min(1, '카테고리 이름을 입력해주세요')
    .min(2, '카테고리 이름은 2자 이상이어야 합니다')
    .max(100, '카테고리 이름은 100자 이하여야 합니다')
    .regex(
      /^[가-힣a-zA-Z0-9\s\(\)\-_\.]+$/,
      '카테고리 이름에는 한글, 영문, 숫자, 공백, 괄호, 하이픈, 언더스코어, 마침표만 사용할 수 있습니다'
    )
    .trim(),
  type: categoryTypeSchema,
  parentId: uuidSchema.optional().nullable(),
  displayOrder: z.number().min(0).max(9999).default(0),
})

/**
 * 카테고리 수정 스키마
 */
export const categoryUpdateSchema = categoryCreateSchema.extend({
  id: uuidSchema,
  isActive: z.boolean().default(true),
})

/**
 * 카테고리 폼 스키마 (문자열 입력 처리)
 */
export const categoryFormSchema = z.object({
  organizationId: uuidSchema,
  name: z
    .string()
    .min(1, '카테고리 이름을 입력해주세요')
    .min(2, '카테고리 이름은 2자 이상이어야 합니다')
    .max(100, '카테고리 이름은 100자 이하여야 합니다')
    .regex(
      /^[가-힣a-zA-Z0-9\s\(\)\-_\.]+$/,
      '카테고리 이름에는 한글, 영문, 숫자, 공백, 괄호, 하이픈, 언더스코어, 마침표만 사용할 수 있습니다'
    )
    .trim(),
  type: categoryTypeSchema,
  parentId: z
    .string()
    .optional()
    .transform(val => {
      if (val === '' || val === 'null' || val === 'undefined') return null
      return val || null
    }),
  displayOrder: z
    .string()
    .optional()
    .transform(val => {
      const num = val ? parseInt(val, 10) : 0
      return isNaN(num) ? 0 : Math.max(0, Math.min(9999, num))
    }),
})

/**
 * 카테고리 필터 스키마
 */
export const categoryFilterSchema = z.object({
  organizationId: uuidSchema,
  type: categoryTypeSchema.optional(),
  parentId: uuidSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  includeChildren: z.boolean().default(false),
  search: z.string().max(100, '검색어는 100자 이하여야 합니다').optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

/**
 * 카테고리 계층 구조 검증 스키마
 */
export const categoryHierarchyValidationSchema = z
  .object({
    categoryId: uuidSchema,
    parentId: uuidSchema.nullable().optional(),
    organizationId: uuidSchema,
  })
  .superRefine(async (data, ctx) => {
    // 자기 자신을 부모로 설정하는 것을 방지
    if (data.parentId === data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '자기 자신을 부모 카테고리로 설정할 수 없습니다',
        path: ['parentId'],
      })
    }

    // 순환 참조 방지는 서버 사이드에서 추가 검증 필요
    // (Prisma 쿼리를 통해 부모-자식 관계 체크)
  })

// ============================================================================
// 조직 (Organization) 스키마
// ============================================================================

/**
 * 조직 생성 스키마
 */
export const organizationCreateSchema = z.object({
  name: z
    .string()
    .min(1, '조직명을 입력해주세요')
    .min(2, '조직명은 2자 이상이어야 합니다')
    .max(100, '조직명은 100자 이하여야 합니다')
    .regex(
      /^[가-힣a-zA-Z0-9\s\.\-_\(\)]+$/,
      '조직명에는 한글, 영문, 숫자, 공백, 괄호, 하이픈, 언더스코어, 마침표만 사용할 수 있습니다'
    )
    .trim(),
  description: z
    .string()
    .max(500, '조직 설명은 500자 이하여야 합니다')
    .optional()
    .or(z.literal('')),
})

/**
 * 조직 수정 스키마
 */
export const organizationUpdateSchema = organizationCreateSchema.extend({
  id: uuidSchema,
})

/**
 * 조직 멤버 역할 스키마
 */
export const memberRoleSchema = z.enum(['owner', 'admin', 'member'], {
  errorMap: () => ({ message: '올바른 역할을 선택해주세요' }),
})

/**
 * 조직 초대 스키마
 */
export const organizationInviteSchema = z.object({
  organizationId: uuidSchema,
  email: emailSchema,
  role: memberRoleSchema.refine(role => role !== 'owner', {
    message: '소유자 역할로는 초대할 수 없습니다',
  }),
})

/**
 * 조직 멤버 업데이트 스키마
 */
export const organizationMemberUpdateSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  role: memberRoleSchema,
})

// ============================================================================
// 사용자 프로필 (User Profile) 스키마
// ============================================================================

/**
 * 사용자 프로필 업데이트 스키마
 */
export const userProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(1, '표시 이름을 입력해주세요')
    .min(2, '표시 이름은 2자 이상이어야 합니다')
    .max(50, '표시 이름은 50자 이하여야 합니다')
    .regex(
      /^[가-힣a-zA-Z0-9\s\-_.]+$/,
      '표시 이름에는 한글, 영문, 숫자, 공백, 하이픈, 언더스코어, 마침표만 사용할 수 있습니다'
    )
    .trim()
    .optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  timezone: z.string().max(50, '시간대는 50자 이하여야 합니다').optional(),
  language: z
    .enum(['ko', 'en'], {
      errorMap: () => ({ message: '지원하는 언어를 선택해주세요' }),
    })
    .default('ko'),
  currency: z
    .enum(['KRW', 'USD', 'EUR', 'JPY'], {
      errorMap: () => ({ message: '지원하는 통화를 선택해주세요' }),
    })
    .default('KRW'),
  avatar: z
    .string()
    .url('올바른 이미지 URL을 입력해주세요')
    .optional()
    .or(z.literal('')),
})

/**
 * 비밀번호 변경 스키마
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z
      .string()
      .min(8, '새 비밀번호는 8자 이상이어야 합니다')
      .max(128, '새 비밀번호는 128자 이하여야 합니다')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        '새 비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다'
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

// ============================================================================
// 검색 및 필터 스키마
// ============================================================================

/**
 * 검색 스키마
 */
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, '검색어를 입력해주세요')
    .max(100, '검색어는 100자 이하여야 합니다')
    .trim(),
  category: z
    .enum([
      'all',
      'transactions',
      'paymentMethods',
      'categories',
      'organizations',
    ])
    .default('all'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
})

/**
 * 페이지네이션 스키마
 */
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
})

/**
 * 정렬 스키마
 */
export const sortSchema = z.object({
  field: z.string().min(1, '정렬 필드를 지정해주세요'),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

// ============================================================================
// 스키마 타입 추출
// ============================================================================

// Transaction 타입들
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>
export type TransactionCreateFormInput = z.infer<
  typeof transactionCreateFormSchema
>
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>
export type TransactionUpdateFormInput = z.infer<
  typeof transactionUpdateFormSchema
>
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>

// Category 타입들
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
export type CategoryFormInput = z.infer<typeof categoryFormSchema>
export type CategoryFilterInput = z.infer<typeof categoryFilterSchema>
export type CategoryHierarchyValidationInput = z.infer<
  typeof categoryHierarchyValidationSchema
>

// PaymentMethod 타입들
export type PaymentMethodCreateInput = z.infer<typeof paymentMethodCreateSchema>
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>
export type PaymentMethodFormInput = z.infer<typeof paymentMethodFormSchema>

// Organization 타입들
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>
export type OrganizationInviteInput = z.infer<typeof organizationInviteSchema>
export type OrganizationMemberUpdateInput = z.infer<
  typeof organizationMemberUpdateSchema
>

// User Profile 타입들
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>

// 공통 타입들
export type SearchInput = z.infer<typeof searchSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type SortInput = z.infer<typeof sortSchema>

// Category type utilities
export type CategoryType = z.infer<typeof categoryTypeSchema>
export type CategoryTypeLabel = (typeof CATEGORY_TYPE_LABELS)[CategoryType]
export type CategoryTypeColor = (typeof CATEGORY_TYPE_COLORS)[CategoryType]

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 스키마 검증 결과 타입
 */
export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
}

/**
 * 스키마 검증 헬퍼 함수
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}

      error.errors.forEach(err => {
        const path = err.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })

      return {
        success: false,
        errors,
      }
    }

    return {
      success: false,
      errors: {
        _form: ['검증 중 오류가 발생했습니다'],
      },
    }
  }
}

/**
 * 안전한 스키마 파싱 (기본값 반환)
 */
export function safeParseSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T
): T {
  const result = schema.safeParse(data)
  return result.success ? result.data : defaultValue
}

/**
 * 카테고리 타입 표시명 매핑
 */
export const CATEGORY_TYPE_LABELS = {
  income: '수입',
  savings: '저축',
  fixed_expense: '고정비',
  variable_expense: '변동비',
} as const

/**
 * 카테고리 타입 컬러 매핑 (UI 표시용)
 */
export const CATEGORY_TYPE_COLORS = {
  income: 'success',
  savings: 'primary',
  fixed_expense: 'warning',
  variable_expense: 'danger',
} as const

/**
 * 카테고리 계층 구조 검증 헬퍼 함수
 */
export function validateCategoryHierarchy(
  categoryId: string,
  parentId: string | null,
  categories: Array<{ id: string; parentId: string | null }>
): { isValid: boolean; error?: string } {
  // 자기 자신을 부모로 설정하는 경우
  if (parentId === categoryId) {
    return {
      isValid: false,
      error: '자기 자신을 부모 카테고리로 설정할 수 없습니다',
    }
  }

  if (!parentId) {
    return { isValid: true }
  }

  // 순환 참조 검사
  const visited = new Set<string>()
  let currentId: string | null = parentId

  while (currentId) {
    if (visited.has(currentId)) {
      return {
        isValid: false,
        error: '순환 참조가 발생합니다',
      }
    }

    if (currentId === categoryId) {
      return {
        isValid: false,
        error: '하위 카테고리를 부모로 설정할 수 없습니다',
      }
    }

    visited.add(currentId)
    const parent = categories.find(cat => cat.id === currentId)
    currentId = parent?.parentId || null
  }

  return { isValid: true }
}
