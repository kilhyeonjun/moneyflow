'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Switch,
  Divider,
  Avatar,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
} from '@heroui/react'
import {
  User,
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Download,
  Upload,
  Trash2,
  Edit,
  Plus,
  Users,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMember =
  Database['public']['Tables']['organization_members']['Row']

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      transactions: true,
      goals: true,
      reports: false,
    },
    privacy: {
      profileVisible: true,
      dataSharing: false,
    },
    preferences: {
      language: 'ko',
      currency: 'KRW',
      theme: 'light',
    },
  })

  useEffect(() => {
    checkOrganizationAndLoadData()
  }, [])

  const checkOrganizationAndLoadData = async () => {
    try {
      const storedOrgId = localStorage.getItem('selectedOrganization')

      if (!storedOrgId) {
        router.push('/organizations')
        return
      }

      setSelectedOrgId(storedOrgId)
      await Promise.all([
        loadUserProfile(),
        loadOrganization(storedOrgId),
        loadMembers(storedOrgId),
      ])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserProfile({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
        })
      }
    } catch (error) {
      console.error('사용자 프로필 로드 실패:', error)
    }
  }

  const loadOrganization = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) throw error
      setOrganization(data)
    } catch (error) {
      console.error('조직 정보 로드 실패:', error)
    }
  }

  const loadMembers = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('멤버 목록 로드 실패:', error)
    }
  }

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }))

    // 실제로는 여기서 서버에 설정을 저장해야 함
    toast.success('설정이 저장되었습니다.')
  }

  const handleExportData = async () => {
    try {
      // 실제 구현에서는 사용자 데이터를 내보내는 로직
      toast.success('데이터 내보내기가 시작되었습니다.')
    } catch (error) {
      toast.error('데이터 내보내기에 실패했습니다.')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // 실제 구현에서는 계정 삭제 로직
      toast.success('계정 삭제 요청이 처리되었습니다.')
      onClose()
    } catch (error) {
      toast.error('계정 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-gray-600">계정, 조직, 알림 설정을 관리하세요</p>
      </div>

      <div className="space-y-6">
        {/* 프로필 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">프로필 설정</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4 mb-6">
              <Avatar
                src={userProfile?.avatar_url}
                name={userProfile?.full_name || userProfile?.email}
                size="lg"
              />
              <div>
                <h3 className="font-semibold">
                  {userProfile?.full_name || '사용자'}
                </h3>
                <p className="text-gray-600">{userProfile?.email}</p>
              </div>
              <Button
                size="sm"
                variant="light"
                startContent={<Edit className="w-4 h-4" />}
              >
                편집
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="이름"
                value={userProfile?.full_name || ''}
                placeholder="이름을 입력하세요"
              />
              <Input
                label="이메일"
                value={userProfile?.email || ''}
                isReadOnly
              />
            </div>
          </CardBody>
        </Card>

        {/* 조직 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">조직 설정</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{organization?.name}</h3>
                  <p className="text-gray-600">{organization?.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  startContent={<Edit className="w-4 h-4" />}
                >
                  편집
                </Button>
              </div>

              <Divider />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">조직 멤버</h4>
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                  >
                    멤버 초대
                  </Button>
                </div>
                <div className="space-y-2">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="sm" />
                        <div>
                          <p className="font-medium">
                            멤버 {member.user_id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(member.joined_at).toLocaleDateString(
                              'ko-KR'
                            )}{' '}
                            가입
                          </p>
                        </div>
                      </div>
                      <Chip
                        color={
                          member.role === 'owner'
                            ? 'primary'
                            : member.role === 'admin'
                              ? 'secondary'
                              : 'default'
                        }
                        size="sm"
                      >
                        {member.role === 'owner'
                          ? '소유자'
                          : member.role === 'admin'
                            ? '관리자'
                            : '멤버'}
                      </Chip>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 알림 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold">알림 설정</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">이메일 알림</p>
                  <p className="text-sm text-gray-600">
                    중요한 업데이트를 이메일로 받습니다
                  </p>
                </div>
                <Switch
                  isSelected={settings.notifications.email}
                  onValueChange={value =>
                    handleSettingChange('notifications', 'email', value)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">거래 알림</p>
                  <p className="text-sm text-gray-600">
                    새로운 거래가 추가될 때 알림을 받습니다
                  </p>
                </div>
                <Switch
                  isSelected={settings.notifications.transactions}
                  onValueChange={value =>
                    handleSettingChange('notifications', 'transactions', value)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">목표 달성 알림</p>
                  <p className="text-sm text-gray-600">
                    재정 목표 달성 시 알림을 받습니다
                  </p>
                </div>
                <Switch
                  isSelected={settings.notifications.goals}
                  onValueChange={value =>
                    handleSettingChange('notifications', 'goals', value)
                  }
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 환경 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">환경 설정</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="언어"
                selectedKeys={[settings.preferences.language]}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  handleSettingChange('preferences', 'language', selectedKey)
                }}
              >
                <SelectItem key="ko">한국어</SelectItem>
                <SelectItem key="en">English</SelectItem>
              </Select>

              <Select
                label="통화"
                selectedKeys={[settings.preferences.currency]}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  handleSettingChange('preferences', 'currency', selectedKey)
                }}
              >
                <SelectItem key="KRW">원 (KRW)</SelectItem>
                <SelectItem key="USD">달러 (USD)</SelectItem>
                <SelectItem key="EUR">유로 (EUR)</SelectItem>
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* 데이터 관리 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold">데이터 관리</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">데이터 내보내기</p>
                  <p className="text-sm text-gray-600">
                    모든 데이터를 JSON 형식으로 다운로드합니다
                  </p>
                </div>
                <Button
                  variant="light"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={handleExportData}
                >
                  내보내기
                </Button>
              </div>

              <Divider />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-600">계정 삭제</p>
                  <p className="text-sm text-gray-600">
                    계정과 모든 데이터가 영구적으로 삭제됩니다
                  </p>
                </div>
                <Button
                  color="danger"
                  variant="light"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={onOpen}
                >
                  계정 삭제
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 계정 삭제 확인 모달 */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>계정 삭제</ModalHeader>
          <ModalBody>
            <p>정말로 계정을 삭제하시겠습니까?</p>
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">⚠️ 주의사항</p>
              <ul className="text-red-700 text-sm mt-2 space-y-1">
                <li>• 모든 거래 내역이 삭제됩니다</li>
                <li>• 재정 목표와 자산 정보가 삭제됩니다</li>
                <li>• 조직 데이터가 삭제됩니다</li>
                <li>• 이 작업은 되돌릴 수 없습니다</li>
              </ul>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              취소
            </Button>
            <Button color="danger" onPress={handleDeleteAccount}>
              계정 삭제
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Toast 알림 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}
