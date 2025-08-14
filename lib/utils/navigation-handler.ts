/**
 * 안전한 네비게이션 핸들러
 * Next.js App Router의 클라이언트 사이드 네비게이션 문제 해결
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { logger } from '@/lib/utils/logger'

export interface NavigationResult {
  success: boolean
  error?: string
  fallbackUsed?: boolean
  method?: 'router' | 'window' | 'failed'
}

export interface NavigationOptions {
  timeout?: number
  retryCount?: number
  fallbackDelay?: number
  onProgress?: (step: string) => void
}

export class NavigationHandler {
  private router: AppRouterInstance
  private defaultOptions: NavigationOptions = {
    timeout: 3000,
    retryCount: 2,
    fallbackDelay: 500,
  }

  constructor(router: AppRouterInstance) {
    this.router = router
  }

  /**
   * 안전한 조직 네비게이션
   */
  async navigateToOrganization(
    orgId: string,
    options?: NavigationOptions
  ): Promise<NavigationResult> {
    const opts = { ...this.defaultOptions, ...options }
    const targetUrl = `/org/${orgId}/dashboard`

    logger.logNavigationEvent('navigation_start', orgId, false)

    // 1차 시도: Next.js router 사용
    const routerResult = await this.tryRouterNavigation(targetUrl, opts)
    if (routerResult.success) {
      logger.logNavigationEvent('navigation_success_router', orgId, true)
      return routerResult
    }

    // 2차 시도: window.location 사용 (대체 방법)
    logger.logNavigationEvent('navigation_fallback_start', orgId, false)

    if (opts.onProgress) {
      opts.onProgress('대체 네비게이션 방법 사용 중...')
    }

    // 잠시 대기 후 대체 방법 실행
    await this.delay(opts.fallbackDelay || 500)

    const fallbackResult = await this.tryWindowNavigation(targetUrl, opts)
    if (fallbackResult.success) {
      logger.logNavigationEvent('navigation_success_fallback', orgId, true)
      return { ...fallbackResult, fallbackUsed: true }
    }

    // 모든 방법 실패
    logger.logNavigationEvent(
      'navigation_failed_all',
      orgId,
      false,
      fallbackResult.error
    )
    return {
      success: false,
      error:
        '페이지 이동에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.',
      method: 'failed',
    }
  }

  /**
   * Next.js router를 사용한 네비게이션 시도
   */
  private async tryRouterNavigation(
    url: string,
    options: NavigationOptions
  ): Promise<NavigationResult> {
    try {
      if (options.onProgress) {
        options.onProgress('페이지 이동 중...')
      }

      // router.push 실행
      await this.router.push(url)

      // 네비게이션 성공 확인 (URL 변경 확인)
      const isSuccess = await this.waitForNavigation(
        url,
        options.timeout || 3000
      )

      if (isSuccess) {
        return {
          success: true,
          method: 'router',
        }
      } else {
        return {
          success: false,
          error: 'Router navigation timeout',
          method: 'router',
        }
      }
    } catch (error) {
      console.error('[ROUTER_NAVIGATION_ERROR]', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Router navigation failed',
        method: 'router',
      }
    }
  }

  /**
   * window.location을 사용한 네비게이션 시도
   */
  private async tryWindowNavigation(
    url: string,
    options: NavigationOptions
  ): Promise<NavigationResult> {
    try {
      if (options.onProgress) {
        options.onProgress('페이지 새로고침 중...')
      }

      // 현재 URL과 다른 경우에만 이동
      if (window.location.pathname !== url) {
        window.location.href = url

        // window.location은 즉시 페이지를 이동시키므로 성공으로 간주
        return {
          success: true,
          method: 'window',
        }
      } else {
        // 이미 해당 페이지에 있는 경우
        return {
          success: true,
          method: 'window',
        }
      }
    } catch (error) {
      console.error('[WINDOW_NAVIGATION_ERROR]', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Window navigation failed',
        method: 'window',
      }
    }
  }

  /**
   * 네비게이션 완료 대기
   */
  private async waitForNavigation(
    targetUrl: string,
    timeout: number
  ): Promise<boolean> {
    const startTime = Date.now()

    return new Promise(resolve => {
      const checkNavigation = () => {
        // 현재 URL이 목표 URL과 일치하는지 확인
        if (
          window.location.pathname.includes(targetUrl) ||
          window.location.pathname === targetUrl
        ) {
          resolve(true)
          return
        }

        // 타임아웃 확인
        if (Date.now() - startTime > timeout) {
          resolve(false)
          return
        }

        // 100ms 후 다시 확인
        setTimeout(checkNavigation, 100)
      }

      checkNavigation()
    })
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 네비게이션 상태 확인
   */
  isNavigationInProgress(): boolean {
    // 간단한 네비게이션 진행 상태 확인
    // 실제로는 더 정교한 로직이 필요할 수 있음
    return document.readyState !== 'complete'
  }

  /**
   * 현재 페이지가 목표 페이지인지 확인
   */
  isCurrentPage(targetUrl: string): boolean {
    return (
      window.location.pathname === targetUrl ||
      window.location.pathname.includes(targetUrl)
    )
  }

  /**
   * 브라우저 뒤로가기 안전 처리
   */
  async safeGoBack(): Promise<NavigationResult> {
    try {
      if (window.history.length > 1) {
        window.history.back()
        return { success: true, method: 'router' }
      } else {
        // 히스토리가 없는 경우 홈으로 이동
        return await this.navigateToOrganization('', { timeout: 2000 })
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Go back failed',
      }
    }
  }
}

/**
 * 네비게이션 핸들러 팩토리 함수
 */
export function createNavigationHandler(
  router: AppRouterInstance
): NavigationHandler {
  return new NavigationHandler(router)
}

/**
 * 간단한 네비게이션 유틸리티 (훅 없이 사용 가능)
 */
export const navigationUtils = {
  /**
   * 현재 URL이 조직 페이지인지 확인
   */
  isOrganizationPage(): boolean {
    return window.location.pathname.includes('/org/')
  },

  /**
   * 현재 조직 ID 추출
   */
  getCurrentOrganizationId(): string | null {
    const match = window.location.pathname.match(/\/org\/([^\/]+)/)
    return match ? match[1] : null
  },

  /**
   * 조직 페이지 URL 생성
   */
  buildOrganizationUrl(orgId: string, page: string = 'dashboard'): string {
    return `/org/${orgId}/${page}`
  },

  /**
   * 안전한 페이지 새로고침
   */
  safeReload(): void {
    try {
      window.location.reload()
    } catch (error) {
      console.error('[SAFE_RELOAD_ERROR]', error)
      // 새로고침 실패 시 현재 페이지로 이동
      window.location.href = window.location.href
    }
  },
}
