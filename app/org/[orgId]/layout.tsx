'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils/validation'
import { checkMembership, getOrganizationDetails } from '@/lib/server-actions/organizations'

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [hasOrgAccess, setHasOrgAccess] = useState<boolean | null>(null)
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string

  useEffect(() => {
    checkAuthAndOrganization()
  }, [orgId])

  const checkAuthAndOrganization = async () => {
    try {
      // 1. 인증 상태 확인
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Auth session error:', error)
        setIsAuthenticated(false)
        router.push('/login')
        return
      }

      if (!user) {
        setIsAuthenticated(false)
        router.push('/login')
        return
      }

      setIsAuthenticated(true)

      // 2. orgId 유효성 검증
      if (!orgId || !isValidUUID(orgId)) {
        console.error('Invalid organization ID:', orgId)
        router.push('/organizations')
        return
      }

      // 3. 조직 접근 권한 확인 (서버 액션 사용)
      const membershipResult = await checkMembership(orgId)
      
      if (!membershipResult.success || !membershipResult.data?.isMember) {
        console.error('Organization access denied')
        setHasOrgAccess(false)
        router.push('/organizations')
        return
      }

      // 4. 조직 상세 정보 가져오기
      const orgDetailsResult = await getOrganizationDetails(orgId)
      
      if (!orgDetailsResult.success) {
        console.error('Failed to get organization details')
        setHasOrgAccess(false)
        router.push('/organizations')
        return
      }

      setCurrentOrg({
        ...orgDetailsResult.data,
        member: membershipResult.data.member,
        role: membershipResult.data.role,
      })
      setHasOrgAccess(true)

    } catch (error) {
      console.error('Auth/Organization check failed:', error)
      setIsAuthenticated(false)
      setHasOrgAccess(false)
      router.push('/login')
    }
  }

  // 인증 상태 변경 감지
  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false)
        setHasOrgAccess(false)
        setCurrentOrg(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true)
        // 조직 접근 권한 재확인
        checkAuthAndOrganization()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, orgId])

  // 로딩 상태 - 인증 확인 중
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // 인증되지 않은 경우 (리다이렉트 중)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 로딩 상태 - 조직 권한 확인 중
  if (hasOrgAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>조직 권한 확인 중...</p>
        </div>
      </div>
    )
  }

  // 조직 접근 권한이 없는 경우 (리다이렉트 중)
  if (!hasOrgAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>조직 선택 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 정상 상태 - 레이아웃 렌더링
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentOrg={currentOrg} orgId={orgId} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}