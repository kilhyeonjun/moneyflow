'use client'

import React from 'react'
import { Button } from '@heroui/react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Handle UNAUTHORIZED error by redirecting to login
    if (
      error.message === 'UNAUTHORIZED' ||
      error instanceof UnauthorizedError
    ) {
      window.location.href = '/login'
      return
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  resetError: () => void
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          문제가 발생했습니다
        </h1>

        <p className="text-gray-600 mb-6">
          예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            color="primary"
            startContent={<RefreshCw className="h-4 w-4" />}
            onPress={resetError}
          >
            다시 시도
          </Button>

          <Button variant="light" onPress={() => (window.location.href = '/')}>
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  )
}

// API 에러 처리를 위한 커스텀 훅
export function useErrorHandler() {
  const handleError = React.useCallback((error: unknown, context?: string) => {
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    console.error(`Error in ${context || 'unknown context'}:`, error)

    // UNAUTHORIZED 에러인 경우 직접 리다이렉트
    if (
      error instanceof Error &&
      (error.message === 'UNAUTHORIZED' || error.name === 'UnauthorizedError')
    ) {
      window.location.href = '/login'
      return
    }

    return errorMessage
  }, [])

  return { handleError }
}

// UNAUTHORIZED 에러를 위한 전역 에러 핸들러
export class UnauthorizedError extends Error {
  constructor(message = 'UNAUTHORIZED') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

// Server Action 결과를 처리하는 유틸리티 (개선된 버전)
export function handleServerActionResult<T>(result: {
  success: boolean
  data?: T
  error?: string
  message?: string
}): T {
  // 개발 환경에서 서버 액션 결과 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('[SERVER_ACTION_RESULT]', {
      success: result.success,
      hasData: !!result.data,
      error: result.error,
      message: result.message,
    })
  }

  // 성공한 경우
  if (result.success) {
    if (result.data !== undefined) {
      return result.data
    }

    // 데이터가 없는 성공 응답 (예: 삭제 작업)
    if (result.message) {
      console.log('[SERVER_ACTION_SUCCESS]', result.message)
    }

    // 빈 데이터도 유효한 응답으로 처리
    return result.data as T
  }

  // 실패한 경우 - 에러 타입별 처리
  const errorMessage = result.error || result.message || '작업에 실패했습니다'

  // UNAUTHORIZED 에러는 특별한 에러 클래스로 throw
  if (
    errorMessage === 'UNAUTHORIZED' ||
    errorMessage.includes('UNAUTHORIZED')
  ) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SERVER_ACTION_UNAUTHORIZED]', errorMessage)
    }
    throw new UnauthorizedError()
  }

  // FORBIDDEN 에러 처리
  if (errorMessage === 'FORBIDDEN' || errorMessage.includes('FORBIDDEN')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SERVER_ACTION_FORBIDDEN]', errorMessage)
    }
    throw new Error('FORBIDDEN')
  }

  // NOT_FOUND 에러 처리
  if (errorMessage === 'NOT_FOUND' || errorMessage.includes('NOT_FOUND')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SERVER_ACTION_NOT_FOUND]', errorMessage)
    }
    throw new Error('NOT_FOUND')
  }

  // VALIDATION_ERROR 처리
  if (errorMessage.includes('VALIDATION_ERROR')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SERVER_ACTION_VALIDATION_ERROR]', errorMessage)
    }
    // VALIDATION_ERROR: 접두사 제거하고 실제 메시지만 전달
    const cleanMessage = errorMessage.replace('VALIDATION_ERROR: ', '')
    throw new Error(cleanMessage)
  }

  // DATABASE_ERROR 처리
  if (errorMessage.includes('DATABASE_ERROR')) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SERVER_ACTION_DATABASE_ERROR]', errorMessage)
    }
    throw new Error(
      '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    )
  }

  // UNKNOWN_ERROR 처리
  if (errorMessage.includes('UNKNOWN_ERROR')) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SERVER_ACTION_UNKNOWN_ERROR]', errorMessage)
    }
    throw new Error('예상치 못한 오류가 발생했습니다. 다시 시도해주세요.')
  }

  // 개발 환경에서 일반 에러 로깅
  if (process.env.NODE_ENV === 'development') {
    console.error('[SERVER_ACTION_ERROR]', errorMessage)
  }

  // 일반 에러 처리
  throw new Error(errorMessage)
}
/**
 * 서버 액션 호출을 안전하게 래핑하는 유틸리티
 * 자동으로 로딩 상태와 에러 처리를 관리합니다.
 */
export async function safeServerAction<T>(
  action: () => Promise<{
    success: boolean
    data?: T
    error?: string
    message?: string
  }>,
  options?: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    loadingState?: {
      setter: (loading: boolean) => void
    }
  }
): Promise<T> {
  const { onSuccess, onError, loadingState } = options || {}

  try {
    // 로딩 상태 시작
    if (loadingState) {
      loadingState.setter(true)
    }

    // 서버 액션 실행
    const result = await action()
    const data = handleServerActionResult(result)

    // 성공 콜백 실행
    if (onSuccess) {
      onSuccess(data)
    }

    return data
  } catch (error) {
    // 에러 콜백 실행
    if (onError) {
      onError(error as Error)
    } else {
      // 기본 에러 처리 - 콘솔에 로깅
      console.error('[SAFE_SERVER_ACTION_ERROR]', error)
    }

    throw error
  } finally {
    // 로딩 상태 종료
    if (loadingState) {
      loadingState.setter(false)
    }
  }
}

/**
 * 서버 액션 결과의 타입 가드
 */
export function isServerActionSuccess<T>(result: {
  success: boolean
  data?: T
  error?: string
}): result is { success: true; data: T } {
  return result.success && result.data !== undefined
}

/**
 * 서버 액션 결과의 에러 타입 확인
 */
export function getServerActionErrorType(error: string): string {
  if (error.includes('UNAUTHORIZED')) return 'UNAUTHORIZED'
  if (error.includes('FORBIDDEN')) return 'FORBIDDEN'
  if (error.includes('NOT_FOUND')) return 'NOT_FOUND'
  if (error.includes('VALIDATION_ERROR')) return 'VALIDATION_ERROR'
  if (error.includes('DATABASE_ERROR')) return 'DATABASE_ERROR'
  if (error.includes('UNKNOWN_ERROR')) return 'UNKNOWN_ERROR'
  return 'GENERAL_ERROR'
}
