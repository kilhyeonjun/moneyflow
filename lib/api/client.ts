import { handleApiError, showToast } from '@/lib/utils/toast'

// API 응답 타입
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status: number
}

// API 에러 클래스
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// API 클라이언트 설정
class ApiClient {
  private baseURL: string
  private defaultHeaders: HeadersInit

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || ''
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  // 요청 인터셉터
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    // 기본 헤더와 사용자 헤더 병합
    const headers: HeadersInit = {
      ...this.defaultHeaders,
      ...options.headers,
    }

    // 인증 토큰 추가 (필요한 경우)
    const token = this.getAuthToken()
    if (token && typeof headers === 'object' && !Array.isArray(headers)) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // 응답 상태 확인
      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      // JSON 응답 파싱
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        return data
      }

      // 텍스트 응답 처리
      const text = await response.text()
      return text as unknown as T
    } catch (error) {
      // 네트워크 에러 또는 기타 에러 처리
      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError('네트워크 연결을 확인해주세요', 0, error)
    }
  }

  // 에러 응답 처리
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = '요청 처리 중 오류가 발생했습니다'
    let errorData: any = null

    try {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } else {
        errorMessage = (await response.text()) || errorMessage
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    // 상태 코드별 에러 메시지 커스터마이징
    switch (response.status) {
      case 400:
        errorMessage = errorData?.error || '잘못된 요청입니다'
        break
      case 401:
        errorMessage = '인증이 필요합니다'
        this.handleAuthError()
        break
      case 403:
        errorMessage = '권한이 없습니다'
        break
      case 404:
        errorMessage = '요청한 리소스를 찾을 수 없습니다'
        break
      case 422:
        errorMessage = '입력 정보를 확인해주세요'
        break
      case 429:
        errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
        break
      case 500:
        errorMessage = '서버 오류가 발생했습니다'
        break
      case 503:
        errorMessage = '서비스를 일시적으로 사용할 수 없습니다'
        break
    }

    throw new ApiError(errorMessage, response.status, errorData)
  }

  // 인증 토큰 가져오기
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null

    // localStorage 또는 쿠키에서 토큰 가져오기
    return localStorage.getItem('auth_token') || null
  }

  // 인증 에러 처리
  private handleAuthError(): void {
    if (typeof window !== 'undefined') {
      // 토큰 제거
      localStorage.removeItem('auth_token')

      // 로그인 페이지로 리다이렉트
      window.location.href = '/login'
    }
  }

  // HTTP 메서드들
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // 파일 업로드
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Content-Type을 설정하지 않음 (브라우저가 자동으로 설정)
      },
    })
  }
}

// 싱글톤 인스턴스
export const apiClient = new ApiClient()

// 편의 함수들
export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  try {
    return await apiClient.get<T>(endpoint, params)
  } catch (error) {
    handleApiError(error, `GET ${endpoint}`)
    throw error
  }
}

export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  try {
    return await apiClient.post<T>(endpoint, data)
  } catch (error) {
    handleApiError(error, `POST ${endpoint}`)
    throw error
  }
}

export async function apiPut<T>(endpoint: string, data?: any): Promise<T> {
  try {
    return await apiClient.put<T>(endpoint, data)
  } catch (error) {
    handleApiError(error, `PUT ${endpoint}`)
    throw error
  }
}

export async function apiPatch<T>(endpoint: string, data?: any): Promise<T> {
  try {
    return await apiClient.patch<T>(endpoint, data)
  } catch (error) {
    handleApiError(error, `PATCH ${endpoint}`)
    throw error
  }
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  try {
    return await apiClient.delete<T>(endpoint)
  } catch (error) {
    handleApiError(error, `DELETE ${endpoint}`)
    throw error
  }
}

// React Query와 함께 사용하기 위한 헬퍼
export function createApiQuery<T>(
  endpoint: string,
  params?: Record<string, any>
) {
  return {
    queryKey: [endpoint, params],
    queryFn: () => apiGet<T>(endpoint, params),
    retry: (failureCount: number, error: any) => {
      // 4xx 에러는 재시도하지 않음
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return false
      }
      // 최대 3번 재시도
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  }
}

// Mutation을 위한 헬퍼
export function createApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: ApiError, variables: TVariables) => void
    successMessage?: string
    errorMessage?: string
  }
) {
  return {
    mutationFn,
    onSuccess: (data: TData, variables: TVariables) => {
      if (options?.successMessage) {
        showToast.success(options.successMessage)
      }
      options?.onSuccess?.(data, variables)
    },
    onError: (error: ApiError, variables: TVariables) => {
      if (options?.errorMessage) {
        showToast.error(options.errorMessage)
      } else {
        handleApiError(error)
      }
      options?.onError?.(error, variables)
    },
  }
}
