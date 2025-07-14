import toast from 'react-hot-toast'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

// 토스트 스타일 설정
const toastStyles = {
  success: {
    style: {
      background: '#10B981',
      color: '#FFFFFF',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#FFFFFF',
      secondary: '#10B981',
    },
  },
  error: {
    style: {
      background: '#EF4444',
      color: '#FFFFFF',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#FFFFFF',
      secondary: '#EF4444',
    },
  },
  warning: {
    style: {
      background: '#F59E0B',
      color: '#FFFFFF',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#FFFFFF',
      secondary: '#F59E0B',
    },
  },
  info: {
    style: {
      background: '#3B82F6',
      color: '#FFFFFF',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#FFFFFF',
      secondary: '#3B82F6',
    },
  },
}

// 향상된 토스트 함수들
export const showToast = {
  success: (message: string, options?: { duration?: number }) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      ...toastStyles.success,
    })
  },

  error: (message: string, options?: { duration?: number }) => {
    return toast.error(message, {
      duration: options?.duration || 5000,
      ...toastStyles.error,
    })
  },

  warning: (message: string, options?: { duration?: number }) => {
    return toast(message, {
      duration: options?.duration || 4000,
      icon: '⚠️',
      ...toastStyles.warning,
    })
  },

  info: (message: string, options?: { duration?: number }) => {
    return toast(message, {
      duration: options?.duration || 3000,
      icon: 'ℹ️',
      ...toastStyles.info,
    })
  },

  loading: (message: string = '처리 중...') => {
    return toast.loading(message, {
      style: {
        background: '#6B7280',
        color: '#FFFFFF',
      },
    })
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, messages, {
      success: toastStyles.success,
      error: toastStyles.error,
      loading: {
        style: {
          background: '#6B7280',
          color: '#FFFFFF',
        },
      },
    })
  },
}

// 특정 상황별 토스트 메시지
export const toastMessages = {
  // 거래 관련
  transaction: {
    added: '거래가 성공적으로 추가되었습니다',
    updated: '거래가 성공적으로 수정되었습니다',
    deleted: '거래가 성공적으로 삭제되었습니다',
    addError: '거래 추가에 실패했습니다',
    updateError: '거래 수정에 실패했습니다',
    deleteError: '거래 삭제에 실패했습니다',
    loading: '거래를 처리하는 중...',
  },

  // 자산 관련
  asset: {
    added: '자산이 성공적으로 추가되었습니다',
    updated: '자산이 성공적으로 수정되었습니다',
    deleted: '자산이 성공적으로 삭제되었습니다',
    addError: '자산 추가에 실패했습니다',
    updateError: '자산 수정에 실패했습니다',
    deleteError: '자산 삭제에 실패했습니다',
    loading: '자산을 처리하는 중...',
  },

  // 인증 관련
  auth: {
    loginSuccess: '성공적으로 로그인되었습니다',
    logoutSuccess: '성공적으로 로그아웃되었습니다',
    signupSuccess: '회원가입이 완료되었습니다',
    loginError: '로그인에 실패했습니다',
    signupError: '회원가입에 실패했습니다',
    sessionExpired: '세션이 만료되었습니다. 다시 로그인해주세요',
  },

  // 조직 관련
  organization: {
    created: '조직이 성공적으로 생성되었습니다',
    updated: '조직 정보가 성공적으로 수정되었습니다',
    joined: '조직에 성공적으로 참여했습니다',
    left: '조직에서 성공적으로 탈퇴했습니다',
    createError: '조직 생성에 실패했습니다',
    updateError: '조직 정보 수정에 실패했습니다',
    joinError: '조직 참여에 실패했습니다',
    leaveError: '조직 탈퇴에 실패했습니다',
  },

  // 일반적인 메시지
  common: {
    saveSuccess: '성공적으로 저장되었습니다',
    saveError: '저장에 실패했습니다',
    loadError: '데이터를 불러오는데 실패했습니다',
    networkError: '네트워크 연결을 확인해주세요',
    validationError: '입력 정보를 확인해주세요',
    permissionError: '권한이 없습니다',
    notFoundError: '요청한 데이터를 찾을 수 없습니다',
  },
}

// 에러 타입별 토스트 메시지 처리
export function handleApiError(error: unknown, context?: string) {
  let message = toastMessages.common.saveError

  if (error instanceof Error) {
    // 특정 에러 메시지 매핑
    if (error.message.includes('network') || error.message.includes('fetch')) {
      message = toastMessages.common.networkError
    } else if (
      error.message.includes('unauthorized') ||
      error.message.includes('403')
    ) {
      message = toastMessages.common.permissionError
    } else if (
      error.message.includes('not found') ||
      error.message.includes('404')
    ) {
      message = toastMessages.common.notFoundError
    } else if (error.message.includes('validation')) {
      message = toastMessages.common.validationError
    } else if (error.message) {
      message = error.message
    }
  }

  showToast.error(message)

  // 개발 환경에서 추가 로깅
  if (process.env.NODE_ENV === 'development') {
    console.error(`API Error in ${context}:`, error)
  }

  return message
}

// 성공 작업을 위한 헬퍼 함수
export function handleApiSuccess(message: string, data?: any) {
  showToast.success(message)

  if (process.env.NODE_ENV === 'development' && data) {
    console.log('API Success:', data)
  }
}

// Promise 기반 작업을 위한 헬퍼
export async function withToast<T>(
  promise: Promise<T>,
  messages: {
    loading?: string
    success?: string | ((data: T) => string)
    error?: string | ((error: any) => string)
  }
): Promise<T> {
  const loadingToast = messages.loading
    ? showToast.loading(messages.loading)
    : null

  try {
    const result = await promise

    if (loadingToast) {
      toast.dismiss(loadingToast)
    }

    if (messages.success) {
      const successMessage =
        typeof messages.success === 'function'
          ? messages.success(result)
          : messages.success
      showToast.success(successMessage)
    }

    return result
  } catch (error) {
    if (loadingToast) {
      toast.dismiss(loadingToast)
    }

    if (messages.error) {
      const errorMessage =
        typeof messages.error === 'function'
          ? messages.error(error)
          : messages.error
      showToast.error(errorMessage)
    } else {
      handleApiError(error)
    }

    throw error
  }
}
