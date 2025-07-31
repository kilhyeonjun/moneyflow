'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // 조직 선택 페이지로 리다이렉트
    router.replace('/organizations')
  }, [router])

  // 로딩 상태 표시
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>조직 선택 페이지로 이동 중...</p>
      </div>
    </div>
  )
}