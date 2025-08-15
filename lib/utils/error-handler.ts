/**
 * 향상된 에러 처리 시스템
 * 에러 분류, 사용자 친화적 메시지 생성, 개발자 정보 제공
 */

import { ServerActionError } from '@/lib/types'
import {
  getErrorMessage,
  extractErrorCode,
  ERROR_MESSAGES,
} from '@/lib/utils/error-messages'

export enum ErrorCategory {
  VALIDATION_ERROR = 'validation',
  DATABASE_ERROR = 'database',
  NETWORK_ERROR = 'network',
  PERMISSION_ERROR = 'permission',
  NOT_FOUND_ERROR = 'not_found',
  UNKNOWN_ERROR = 'unknown',
}

export interface ErrorContext {
  operation: string
  userId?: string
  organizationId?: string
  formData?: any
  [key: string]: any
}

export interface DeveloperErrorInfo {
  category: ErrorCategory
  originalError: any
  context: ErrorContext
  timestamp: string
  stackTrace?: string
  prismaCode?: string
  suggestions: string[]
}

export class EnhancedErrorHandler {
  /**
   * 에러를 카테고리별로 분류
   */
  categorizeError(error: any): ErrorCategory {
    // Prisma 에러 코드 확인
    if (
      error.code &&
      typeof error.code === 'string' &&
      error.code.startsWith('P')
    ) {
      return ErrorCategory.DATABASE_ERROR
    }

    // 서버 액션 에러 확인
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes(ServerActionError.VALIDATION_ERROR)) {
        return ErrorCategory.VALIDATION_ERROR
      }
      if (error.message.includes(ServerActionError.FORBIDDEN)) {
        return ErrorCategory.PERMISSION_ERROR
      }
      if (error.message.includes(ServerActionError.NOT_FOUND)) {
        return ErrorCategory.NOT_FOUND_ERROR
      }
      if (error.message.includes(ServerActionError.UNAUTHORIZED)) {
        return ErrorCategory.PERMISSION_ERROR
      }
    }

    // 네트워크 에러 확인
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return ErrorCategory.NETWORK_ERROR
    }

    return ErrorCategory.UNKNOWN_ERROR
  }

  /**
   * 사용자 친화적 메시지 생성
   */
  generateUserMessage(error: any, context: ErrorContext): string {
    const category = this.categorizeError(error)

    switch (category) {
      case ErrorCategory.VALIDATION_ERROR:
        return this.getValidationErrorMessage(error, context)

      case ErrorCategory.DATABASE_ERROR:
        return this.getDatabaseErrorMessage(error, context)

      case ErrorCategory.PERMISSION_ERROR:
        return this.getPermissionErrorMessage(error, context)

      case ErrorCategory.NOT_FOUND_ERROR:
        return this.getNotFoundErrorMessage(error, context)

      case ErrorCategory.NETWORK_ERROR:
        return '인터넷 연결을 확인하고 다시 시도해주세요.'

      default:
        return this.getUnknownErrorMessage(error, context)
    }
  }

  /**
   * 개발자용 상세 정보 생성
   */
  generateDeveloperInfo(
    error: any,
    context?: ErrorContext
  ): DeveloperErrorInfo {
    const category = this.categorizeError(error)

    return {
      category,
      originalError: {
        name: error.name,
        message: error.message,
        code: error.code,
        meta: error.meta,
      },
      context: context || { operation: 'unknown' },
      timestamp: new Date().toISOString(),
      stackTrace: error.stack,
      prismaCode: error.code,
      suggestions: this.generateSuggestions(error, category),
    }
  }

  /**
   * 검증 에러 메시지
   */
  private getValidationErrorMessage(error: any, context: ErrorContext): string {
    const message = error.message || ''

    // 카테고리 관련 에러
    if (message.includes('Category not found')) {
      return '선택한 카테고리를 찾을 수 없습니다. 다른 카테고리를 선택해주세요.'
    }
    if (
      message.includes('Category type') &&
      (message.includes('not compatible') ||
        message.includes('is not compatible'))
    ) {
      // 더 구체적인 메시지 추출 시도
      if (message.includes('income') && message.includes('expense')) {
        return '수입 카테고리는 지출 거래에 사용할 수 없습니다. 지출 카테고리를 선택해주세요.'
      }
      if (message.includes('expense') && message.includes('income')) {
        return '지출 카테고리는 수입 거래에 사용할 수 없습니다. 수입 카테고리를 선택해주세요.'
      }
      return '선택한 카테고리는 이 거래 유형과 호환되지 않습니다. 거래 유형에 맞는 카테고리를 선택해주세요.'
    }

    // 결제수단 관련 에러
    if (message.includes('Payment method not found')) {
      return '선택한 결제수단을 찾을 수 없습니다. 다른 결제수단을 선택해주세요.'
    }

    // 금액 관련 에러
    if (message.includes('Invalid amount')) {
      return '올바른 금액을 입력해주세요. 금액은 0보다 커야 합니다.'
    }

    // 거래 유형 관련 에러
    if (message.includes('Invalid transaction type')) {
      return '올바른 거래 유형을 선택해주세요.'
    }

    // 필수 필드 관련 에러
    if (message.includes('required')) {
      return '필수 정보를 모두 입력해주세요.'
    }

    return '입력하신 정보를 확인하고 다시 시도해주세요.'
  }

  /**
   * 데이터베이스 에러 메시지
   */
  private getDatabaseErrorMessage(error: any, context: ErrorContext): string {
    const code = error.code

    switch (code) {
      case 'P2002': // Unique constraint violation
        if (context.operation === 'createTransaction') {
          return '이미 동일한 거래가 존재합니다. 거래 정보를 확인해주세요.'
        }
        return '중복된 데이터가 있습니다. 다른 값을 입력해주세요.'

      case 'P2003': // Foreign key constraint violation
        return '연결된 데이터를 찾을 수 없습니다. 선택한 항목이 올바른지 확인해주세요.'

      case 'P2025': // Record not found
        if (context.operation === 'createTransaction') {
          return '거래를 생성할 수 없습니다. 선택한 조직이나 카테고리가 존재하는지 확인해주세요.'
        }
        return '요청한 데이터를 찾을 수 없습니다.'

      case 'P2016': // Query interpretation error
        return '요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'

      case 'P2021': // Table does not exist
        return '시스템 오류가 발생했습니다. 관리자에게 문의해주세요.'

      case 'P2024': // Connection timeout
        return '데이터베이스 연결 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'

      default:
        return '데이터 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }
  }

  /**
   * 권한 에러 메시지
   */
  private getPermissionErrorMessage(error: any, context: ErrorContext): string {
    if (context.operation === 'createTransaction') {
      return '이 조직에서 거래를 추가할 권한이 없습니다.'
    }
    if (context.operation === 'updateTransaction') {
      return '이 거래를 수정할 권한이 없습니다.'
    }
    if (context.operation === 'deleteTransaction') {
      return '이 거래를 삭제할 권한이 없습니다.'
    }
    return '이 작업을 수행할 권한이 없습니다.'
  }

  /**
   * 찾을 수 없음 에러 메시지
   */
  private getNotFoundErrorMessage(error: any, context: ErrorContext): string {
    if (context.operation === 'createTransaction') {
      return '거래를 생성할 수 없습니다. 선택한 항목들이 존재하는지 확인해주세요.'
    }
    if (context.operation === 'updateTransaction') {
      return '수정하려는 거래를 찾을 수 없습니다.'
    }
    if (context.operation === 'deleteTransaction') {
      return '삭제하려는 거래를 찾을 수 없습니다.'
    }
    return '요청한 데이터를 찾을 수 없습니다.'
  }

  /**
   * 알 수 없는 에러 메시지
   */
  private getUnknownErrorMessage(error: any, context: ErrorContext): string {
    if (context.operation === 'createTransaction') {
      return '거래를 저장하는 중 예상치 못한 문제가 발생했습니다. 다시 시도해주세요.'
    }
    if (context.operation === 'updateTransaction') {
      return '거래를 수정하는 중 예상치 못한 문제가 발생했습니다. 다시 시도해주세요.'
    }
    if (context.operation === 'deleteTransaction') {
      return '거래를 삭제하는 중 예상치 못한 문제가 발생했습니다. 다시 시도해주세요.'
    }
    return '예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  /**
   * 에러 해결 제안 생성
   */
  private generateSuggestions(error: any, category: ErrorCategory): string[] {
    const suggestions: string[] = []

    switch (category) {
      case ErrorCategory.VALIDATION_ERROR:
        suggestions.push('입력 데이터의 형식과 필수 필드를 확인하세요')
        suggestions.push('Zod 스키마 검증 로직을 확인하세요')
        if (error.message?.includes('Category')) {
          suggestions.push('카테고리 ID가 올바른 UUID 형식인지 확인하세요')
          suggestions.push(
            '카테고리가 해당 조직에 속하고 활성 상태인지 확인하세요'
          )
        }
        break

      case ErrorCategory.DATABASE_ERROR:
        suggestions.push('데이터베이스 연결 상태를 확인하세요')
        suggestions.push(
          'Prisma 스키마와 실제 데이터베이스 구조가 일치하는지 확인하세요'
        )
        if (error.code === 'P2002') {
          suggestions.push(
            '중복 제약 조건을 확인하고 유니크 필드 값을 검토하세요'
          )
        }
        if (error.code === 'P2003') {
          suggestions.push('외래 키 관계와 참조 무결성을 확인하세요')
        }
        break

      case ErrorCategory.PERMISSION_ERROR:
        suggestions.push('사용자 인증 상태를 확인하세요')
        suggestions.push('조직 멤버십과 권한 레벨을 확인하세요')
        suggestions.push('RLS 정책이 올바르게 설정되어 있는지 확인하세요')
        break

      case ErrorCategory.NOT_FOUND_ERROR:
        suggestions.push('요청한 리소스의 ID가 올바른지 확인하세요')
        suggestions.push('리소스가 삭제되지 않았는지 확인하세요')
        suggestions.push('조직 필터링이 올바르게 적용되었는지 확인하세요')
        break

      default:
        suggestions.push('에러 로그를 자세히 확인하세요')
        suggestions.push('네트워크 연결 상태를 확인하세요')
        suggestions.push('서버 상태와 리소스 사용량을 확인하세요')
    }

    return suggestions
  }
}

// 싱글톤 에러 핸들러 인스턴스
export const errorHandler = new EnhancedErrorHandler()
