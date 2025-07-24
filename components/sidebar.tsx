'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import {
  Home,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
  Wallet,
  Target,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

type DropdownMenuItemType = Organization | { id: 'manage'; name: '조직 관리' }

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '거래 관리', href: '/transactions', icon: CreditCard },
  { name: '자산 관리', href: '/assets', icon: Wallet },
  { name: '재정 목표', href: '/goals', icon: Target },
  { name: '통계 분석', href: '/analytics', icon: BarChart3 },
  { name: '설정', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const [isMounted, setIsMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [userOrgs, setUserOrgs] = useState<Organization[]>([])
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadCurrentOrganization()
      loadUserOrganizations()
    }
  }, [isMounted])

  const loadCurrentOrganization = async () => {
    if (typeof window === 'undefined') return

    const selectedOrgId = localStorage.getItem('selectedOrganization')
    if (!selectedOrgId) {
      // 선택된 조직이 없으면 사용자 조직 목록을 먼저 로드하고 첫 번째 조직을 선택
      await loadUserOrganizations()
      return
    }

    try {
      // 현재 사용자 정보 가져오기
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('사용자 정보를 가져올 수 없습니다:', userError)
        localStorage.removeItem('selectedOrganization')
        return
      }

      // API를 통해 사용자가 속한 조직인지 확인하며 조직 정보 가져오기
      const response = await fetch(`/api/organizations/${selectedOrgId}/check-membership?userId=${user.id}`)
      
      if (!response.ok) {
        console.warn('선택된 조직에 접근할 수 없습니다. 다른 조직을 선택합니다.')
        localStorage.removeItem('selectedOrganization')
        await loadUserOrganizations()
        return
      }

      const orgData = await response.json()
      setCurrentOrg(orgData)
    } catch (error) {
      console.error('현재 조직 정보 로드 실패:', error)
      localStorage.removeItem('selectedOrganization')
      await loadUserOrganizations()
    }
  }

  const createDefaultOrganization = async (user: any) => {
    try {
      // 기본 조직 생성
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '개인 가계부',
          description: '개인 재정 관리를 위한 기본 조직입니다.',
          createdBy: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('조직 생성 실패')
      }

      const newOrg = await response.json()

      // 기본 데이터 생성 (카테고리, 결제수단 등)
      const initResponse = await fetch(`/api/organizations/${newOrg.id}/initial-data`, {
        method: 'POST',
      })

      if (!initResponse.ok) {
        console.warn('기본 데이터 생성 실패, 조직은 생성되었습니다.')
      }

      // 조직 목록 다시 로드
      await loadUserOrganizations()
    } catch (error) {
      console.error('기본 조직 생성 실패:', error)
      // 조직 생성에 실패해도 앱은 계속 사용할 수 있도록 함
      setCurrentOrg(null)
      setUserOrgs([])
    }
  }

  const loadUserOrganizations = async () => {
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('사용자 정보를 가져올 수 없습니다:', userError)
        return
      }

      // API를 통해 사용자 조직 목록 조회
      const response = await fetch(`/api/organizations?userId=${user.id}`)
      
      if (!response.ok) {
        console.error('사용자 조직 목록 조회 실패:', response.status, response.statusText)
        setUserOrgs([])
        return
      }

      const orgs = await response.json()
      
      // API 응답에서 필요한 조직 정보만 추출
      const organizationList = orgs.map((org: any) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        created_at: org.createdAt,
      }))
      
      setUserOrgs(organizationList || [])

      // 조직이 없는 경우 기본 조직 생성
      if (!organizationList || organizationList.length === 0) {
        console.info('사용자가 속한 조직이 없습니다. 기본 조직을 생성합니다.')
        await createDefaultOrganization(user)
        return
      }

      // 현재 선택된 조직이 없고 조직이 존재한다면 첫 번째 조직을 자동 선택
      if (!currentOrg && organizationList.length > 0 && typeof window !== 'undefined') {
        const firstOrg = organizationList[0]
        localStorage.setItem('selectedOrganization', firstOrg.id)
        setCurrentOrg(firstOrg)
      }
    } catch (error) {
      console.error('사용자 조직 목록 로드 중 예상치 못한 오류:', error)
    }
  }

  const switchOrganization = (orgId: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('selectedOrganization', orgId)
    window.location.reload()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedOrganization')
    }
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Organization Selector */}
      <div className="p-4 border-b border-gray-200">
        {currentOrg ? (
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="flat"
                className="w-full justify-between"
                endContent={<ChevronDown className="h-4 w-4" />}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{currentOrg.name}</span>
                </div>
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="조직 선택"
              items={[...userOrgs, { id: 'manage', name: '조직 관리' }]}
            >
              {(item: DropdownMenuItemType) => (
                <DropdownItem
                  key={item.id}
                  onPress={() =>
                    item.id === 'manage'
                      ? router.push('/organizations')
                      : switchOrganization(item.id)
                  }
                  className={
                    item.id === currentOrg?.id
                      ? 'bg-blue-50'
                      : item.id === 'manage'
                        ? 'text-blue-600'
                        : ''
                  }
                >
                  {item.name}
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        ) : (
          <Button
            variant="flat"
            className="w-full"
            onPress={() => router.push('/organizations')}
            startContent={<Building2 className="h-4 w-4" />}
          >
            조직 선택
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map(item => {
          const isActive = pathname === item.href
          return (
            <Button
              key={item.name}
              variant={isActive ? 'flat' : 'light'}
              className={`w-full justify-start ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
              startContent={<item.icon className="h-5 w-5" />}
              onPress={() => router.push(item.href)}
            >
              {item.name}
            </Button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="light"
          className="w-full justify-start text-red-600"
          startContent={<LogOut className="h-5 w-5" />}
          onPress={handleLogout}
        >
          로그아웃
        </Button>
      </div>
    </div>
  )

  // 클라이언트 마운트 전에는 기본 구조만 렌더링
  if (!isMounted) {
    return (
      <>
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button isIconOnly variant="flat">
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="flex flex-col h-full">
            {/* Organization Selector Placeholder */}
            <div className="p-4 border-b border-gray-200">
              <Button variant="flat" className="w-full justify-start">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>로딩 중...</span>
                </div>
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigation.map(item => (
                <Button
                  key={item.name}
                  variant="light"
                  className="w-full justify-start text-gray-700"
                  startContent={<item.icon className="h-5 w-5" />}
                >
                  {item.name}
                </Button>
              ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="light"
                className="w-full justify-start text-red-600"
                startContent={<LogOut className="h-5 w-5" />}
              >
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          isIconOnly
          variant="flat"
          onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent />
      </div>
    </>
  )
}
