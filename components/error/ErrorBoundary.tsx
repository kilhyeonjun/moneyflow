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

// Server Action 결과를 처리하는 유틸리티
export function handleServerActionResult<T>(result: {
  success: boolean
  data?: T
  error?: string
}): T {
  if (result.success && result.data) {
    return result.data
  }

  // UNAUTHORIZED 에러는 특별한 에러 클래스로 throw
  if (result.error === 'UNAUTHORIZED') {
    throw new UnauthorizedError()
  }

  // 다른 에러들
  throw new Error(result.error || '작업에 실패했습니다')
}
