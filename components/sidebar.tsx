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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '거래 관리', href: '/transactions', icon: CreditCard },
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
    if (!selectedOrgId) return

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', selectedOrgId)
        .single()

      if (error) throw error
      setCurrentOrg(data)
    } catch (error) {
      console.error('현재 조직 정보 로드 실패:', error)
    }
  }

  const loadUserOrganizations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          organization_id,
          organizations (
            id,
            name,
            description,
            created_at
          )
        `
        )
        .eq('user_id', user.id)

      if (error) throw error

      const orgs = data
        ?.map(item => item.organizations)
        .filter(Boolean) as any[]
      setUserOrgs(orgs || [])
    } catch (error) {
      console.error('사용자 조직 목록 로드 실패:', error)
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
              {(item: any) => (
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