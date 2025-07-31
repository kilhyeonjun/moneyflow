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
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Organization = {
  id: string
  name: string
  description?: string
  created_at: string
}

type DropdownMenuItemType = Organization | { id: 'manage'; name: '조직 관리' }

interface SidebarProps {
  currentOrg?: Organization | null
  orgId: string
}

export function Sidebar({ currentOrg, orgId }: SidebarProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userOrgs, setUserOrgs] = useState<Organization[]>([])
  const pathname = usePathname()
  const router = useRouter()

  // URL 기반 네비게이션 메뉴
  const navigation = [
    { name: '대시보드', href: `/org/${orgId}/dashboard`, icon: Home },
    { name: '거래 관리', href: `/org/${orgId}/transactions`, icon: CreditCard },
    { name: '자산 관리', href: `/org/${orgId}/assets`, icon: Wallet },
    { name: '재정 목표', href: `/org/${orgId}/goals`, icon: Target },
    { name: '통계 분석', href: `/org/${orgId}/analytics`, icon: BarChart3 },
    { name: '설정', href: `/org/${orgId}/settings`, icon: Settings },
  ]

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadUserOrganizations()
    }
  }, [isMounted])

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
    } catch (error) {
      console.error('사용자 조직 목록 로드 중 예상치 못한 오류:', error)
    }
  }

  const switchOrganization = (newOrgId: string) => {
    // 현재 선택된 조직과 동일하면 아무것도 하지 않음
    if (orgId === newOrgId) {
      return
    }
    
    // URL 기반 조직 전환 - 대시보드로 이동
    router.push(`/org/${newOrgId}/dashboard`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
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
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : item.id === 'manage'
                        ? 'text-blue-600'
                        : ''
                  }
                  startContent={
                    item.id === currentOrg?.id ? (
                      <Check className="w-4 h-4 text-blue-600" />
                    ) : item.id === 'manage' ? (
                      <Settings className="w-4 h-4" />
                    ) : null
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