'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody } from '@heroui/react'
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  useEffect(() => {
    checkOrganizationSelection()
  }, [])

  const checkOrganizationSelection = async () => {
    try {
      // 로컬 스토리지에서 선택된 조직 확인
      const storedOrgId = localStorage.getItem('selectedOrganization')

      if (!storedOrgId) {
        // 선택된 조직이 없으면 조직 선택 페이지로 이동
        router.push('/organizations')
        return
      }

      // 사용자가 해당 조직의 멤버인지 확인
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', storedOrgId)
        .single()

      if (error || !data) {
        // 권한이 없으면 조직 선택 페이지로 이동
        localStorage.removeItem('selectedOrganization')
        router.push('/organizations')
        return
      }

      setSelectedOrgId(storedOrgId)
    } catch (error) {
      console.error('조직 확인 실패:', error)
      router.push('/organizations')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-600">가계부 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 수입</h3>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-green-600">₩3,500,000</div>
            <p className="text-xs text-gray-500">전월 대비 +12%</p>
          </CardBody>
        </Card>
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 지출</h3>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-red-600">₩2,100,000</div>
            <p className="text-xs text-gray-500">전월 대비 -5%</p>
          </CardBody>
        </Card>
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 저축</h3>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-blue-600">₩1,400,000</div>
            <p className="text-xs text-gray-500">목표 달성률 93%</p>
          </CardBody>
        </Card>{' '}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">총 자산</h3>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-purple-600">
              ₩45,200,000
            </div>
            <p className="text-xs text-gray-500">목표까지 54,800,000원</p>
          </CardBody>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">최근 거래 내역</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-gray-500">
            <p>거래 내역이 없습니다.</p>
            <p className="text-sm mt-2">첫 번째 거래를 추가해보세요!</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
