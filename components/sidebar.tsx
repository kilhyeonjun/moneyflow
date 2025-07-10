'use client'

import { useState } from 'react'
import { Button } from '@heroui/react'
import { 
  BarChart3, 
  Home, 
  CreditCard, 
  PieChart, 
  Settings, 
  Users, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '거래 관리', href: '/transactions', icon: CreditCard },
  { name: '통계 분석', href: '/analytics', icon: PieChart },
  { name: '조직 관리', href: '/organization', icon: Users },
  { name: '설정', href: '/settings', icon: Settings },
]

'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { 
  Home, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Building2,
  ChevronDown
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [userOrgs, setUserOrgs] = useState<Organization[]>([])
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    loadCurrentOrganization()
    loadUserOrganizations()
  }, [])

  const loadCurrentOrganization = async () => {
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            description,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      const orgs = data?.map(item => item.organizations).filter(Boolean) as Organization[]
      setUserOrgs(orgs || [])
    } catch (error) {
      console.error('사용자 조직 목록 로드 실패:', error)
    }
  }

  const switchOrganization = (orgId: string) => {
    localStorage.setItem('selectedOrganization', orgId)
    window.location.reload()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('selectedOrganization')
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
            <DropdownMenu>
              {userOrgs.map((org) => (
                <DropdownItem
                  key={org.id}
                  onPress={() => switchOrganization(org.id)}
                  className={org.id === currentOrg.id ? 'bg-blue-50' : ''}
                >
                  {org.name}
                </DropdownItem>
              ))}
              <DropdownItem
                key="manage"
                onPress={() => router.push('/organizations')}
                className="text-blue-600"
              >
                조직 관리
              </DropdownItem>
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
        {navigation.map((item) => {
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

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          isIconOnly
          variant="flat"
          onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <SidebarContent />
      </div>
    </>
  )
}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">MoneyFlow</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t px-4 py-4">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">사용자</p>
                <p className="text-xs text-gray-500">user@example.com</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              startContent={<LogOut className="h-4 w-4" />}
              onPress={handleLogout}
            >
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}