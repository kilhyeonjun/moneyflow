'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Shield,
  Download,
  Trash2,
  Edit,
  Plus,
  Users,
  Mail,
  Clock,
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

interface Invitation {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  created_at: string
  expires_at: string
  organizations: { name: string }
}

// Settings types - 추후 구현 예정
// type SettingsType = {
//   notifications: {
//     email: boolean
//     push: boolean
//     transactions: boolean
//     goals: boolean
//     reports: boolean
//   }
//   privacy: {
//     profileVisible: boolean
//     dataSharing: boolean
//   }
//   preferences: {
//     language: string
//     currency: string
//     theme: string
//   }
// }

// type SettingValue = boolean | string

export default function SettingsPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { 
    isOpen: isInviteModalOpen, 
    onOpen: onInviteModalOpen, 
    onClose: onInviteModalClose 
  } = useDisclosure()
  
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  
  // 초대 모달 상태
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member'
  })
  const [inviting, setInviting] = useState(false)

  // Settings state - 추후 구현 예정
  // const [settings, setSettings] = useState({
  //   notifications: {
  //     email: true,
  //     push: false,
  //     transactions: true,
  //     goals: true,
  //     reports: false,
  //   },
  //   privacy: {
  //     profileVisible: true,
  //     dataSharing: false,
  //   },
  //   preferences: {
  //     language: 'ko',
  //     currency: 'KRW',
  //     theme: 'light',
  //   },
  // })

  // 프로필 편집 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({
    full_name: '',
    avatar_url: '',
  })

  // 조직 편집 상태
  const [isEditingOrganization, setIsEditingOrganization] = useState(false)
  const [editOrgData, setEditOrgData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (orgId) {
      loadSettingsData()
    }
    // loadUserSettings() - 추후 구현 예정
  }, [orgId])

  // const loadUserSettings = () => {
  //   try {
  //     const savedSettings = localStorage.getItem('userSettings')
  //     if (savedSettings) {
  //       setSettings(JSON.parse(savedSettings))
  //     }
  //   } catch (error) {
  //     console.error('설정 로드 실패:', error)
  //   }
  // }

  const loadSettingsData = async () => {
    try {
      setLoading(true)
      
      await Promise.all([
        loadUserProfile(),
        loadOrganization(orgId),
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
        const profile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
        }
        
        setUserProfile(profile)
        setEditProfileData({
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || '',
        })
      }
    } catch (error) {
      console.error('사용자 프로필 로드 실패:', error)
    }
  }

  const loadOrganization = async (organizationId: string) => {
    try {
      // Supabase Auth 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // API 경로를 통해 조직 및 멤버 데이터 로드
      const response = await fetch(`/api/settings?organizationId=${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch settings data')
      }

      const { organization, members } = await response.json()
      setOrganization(organization)
      setMembers(members || [])
      
      // 조직 편집 데이터 초기화
      setEditOrgData({
        name: organization?.name || '',
        description: organization?.description || '',
      })
      
      // 초대 목록도 함께 로드
      await loadInvitations(organizationId, session)
    } catch (error) {
      console.error('설정 데이터 로드 실패:', error)
    }
  }

  const loadMembers = async (orgId: string) => {
    // 멤버 로드는 이제 loadOrganization에서 함께 처리됨
    // 호환성을 위해 빈 함수로 유지
  }

  const loadInvitations = async (organizationId: string, session: any) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const { invitations } = await response.json()
        setInvitations(invitations || [])
      }
    } catch (error) {
      console.error('초대 목록 로드 실패:', error)
    }
  }

  const handleInviteMember = async () => {
    if (!orgId || !inviteData.email.trim()) {
      toast.error('이메일을 입력하세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteData.email)) {
      toast.error('올바른 이메일 형식을 입력하세요.')
      return
    }

    try {
      setInviting(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch(`/api/organizations/${orgId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to send invitation'
        
        // response를 복제하여 multiple read 방지
        const responseClone = response.clone()
        
        try {
          const errorData = await response.json()
          console.error('초대 API 에러:', errorData)
          errorMessage = errorData.details || errorData.error || errorMessage
        } catch (jsonError) {
          // JSON 파싱 실패 시 복제된 response로 text 시도
          try {
            const errorText = await responseClone.text()
            console.error('초대 API 응답 (텍스트):', errorText)
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
          } catch (textError) {
            console.error('응답 읽기 실패:', textError)
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      try {
        const result = await response.json()
        console.log('초대 성공:', result)
      } catch (jsonError) {
        console.log('응답 JSON 파싱 실패 (성공적인 응답이지만 JSON이 아님):', jsonError)
      }
      
      toast.success('초대가 성공적으로 발송되었습니다!')
      
      // 초대 목록 새로고침
      await loadInvitations(orgId, session)
      
      // 모달 닫기 및 폼 초기화
      setInviteData({ email: '', role: 'member' })
      onInviteModalClose()
      
    } catch (error: any) {
      console.error('초대 발송 실패:', error)
      toast.error(error.message || '초대 발송에 실패했습니다.')
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!orgId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch(
        `/api/organizations/${orgId}/invitations?invitationId=${invitationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to cancel invitation')
      }

      toast.success('초대가 취소되었습니다.')
      
      // 초대 목록 새로고침
      await loadInvitations(orgId, session)
      
    } catch (error: any) {
      console.error('초대 취소 실패:', error)
      toast.error('초대 취소에 실패했습니다.')
    }
  }

  // const handleSettingChange = (category: keyof SettingsType, key: string, value: SettingValue) => {
  //   setSettings(prev => ({
  //     ...prev,
  //     [category]: {
  //       ...prev[category as keyof typeof prev],
  //       [key]: value,
  //     },
  //   }))

  //   // 로컬 스토리지에 설정 저장
  //   localStorage.setItem('userSettings', JSON.stringify({
  //     ...settings,
  //     [category]: {
  //       ...settings[category as keyof typeof settings],
  //       [key]: value,
  //     },
  //   }))

  //   toast.success('설정이 저장되었습니다.')
  // }

  const handleUpdateProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'profile',
          data: editProfileData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // UI 업데이트
      setUserProfile(prev => prev ? {
        ...prev,
        full_name: editProfileData.full_name,
        avatar_url: editProfileData.avatar_url,
      } : null)

      setIsEditingProfile(false)
      toast.success('프로필이 업데이트되었습니다.')

      // 페이지 새로고침하여 변경사항 반영
      window.location.reload()
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    }
  }

  const handleUpdateOrganization = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !orgId) {
        toast.error('권한이 없습니다.')
        return
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'organization',
          data: {
            organizationId: orgId,
            name: editOrgData.name,
            description: editOrgData.description,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update organization')
      }

      // UI 업데이트
      setOrganization(prev => prev ? {
        ...prev,
        name: editOrgData.name,
        description: editOrgData.description,
      } : null)

      setIsEditingOrganization(false)
      toast.success('조직 정보가 업데이트되었습니다.')
    } catch (error) {
      console.error('조직 업데이트 실패:', error)
      toast.error('조직 정보 업데이트에 실패했습니다.')
    }
  }

  const handleExportData = async () => {
    try {
      if (!orgId) {
        toast.error('조직을 선택하세요.')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('로그인이 필요합니다.')
        return
      }

      // 모든 데이터를 가져와서 JSON으로 내보내기
      const exportData = {
        userProfile: userProfile,
        organization: organization,
        // settings: settings, // 추후 구현 예정
        exportedAt: new Date().toISOString(),
      }

      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moneyflow-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('데이터가 성공적으로 내보내졌습니다.')
    } catch (error) {
      console.error('데이터 내보내기 실패:', error)
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
                onPress={() => setIsEditingProfile(!isEditingProfile)}
              >
                {isEditingProfile ? '취소' : '편집'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="이름"
                value={isEditingProfile ? editProfileData.full_name : (userProfile?.full_name || '')}
                placeholder="이름을 입력하세요"
                isReadOnly={!isEditingProfile}
                onChange={(e) => isEditingProfile && setEditProfileData(prev => ({ ...prev, full_name: e.target.value }))}
              />
              <Input
                label="이메일"
                value={userProfile?.email || ''}
                isReadOnly
              />
            </div>

            {isEditingProfile && (
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => {
                    setIsEditingProfile(false)
                    setEditProfileData({
                      full_name: userProfile?.full_name || '',
                      avatar_url: userProfile?.avatar_url || '',
                    })
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleUpdateProfile}
                >
                  저장
                </Button>
              </div>
            )}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isEditingOrganization ? (
                      <div className="space-y-2">
                        <Input
                          label="조직명"
                          value={editOrgData.name}
                          placeholder="조직명을 입력하세요"
                          onChange={(e) => setEditOrgData(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                          label="설명"
                          value={editOrgData.description}
                          placeholder="조직 설명을 입력하세요"
                          onChange={(e) => setEditOrgData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-semibold">{organization?.name}</h3>
                        <p className="text-gray-600">{organization?.description}</p>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => setIsEditingOrganization(!isEditingOrganization)}
                  >
                    {isEditingOrganization ? '취소' : '편집'}
                  </Button>
                </div>

                {isEditingOrganization && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => {
                        setIsEditingOrganization(false)
                        setEditOrgData({
                          name: organization?.name || '',
                          description: organization?.description || '',
                        })
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onPress={handleUpdateOrganization}
                    >
                      저장
                    </Button>
                  </div>
                )}
              </div>

              <Divider />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">조직 멤버</h4>
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={onInviteModalOpen}
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

                {/* 초대 목록 */}
                {invitations.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <h4 className="font-medium mb-3">대기 중인 초대</h4>
                      <div className="space-y-2">
                        {invitations
                          .filter(invitation => invitation.status === 'pending')
                          .map(invitation => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar size="sm" name={invitation.email} />
                                <div>
                                  <p className="font-medium">{invitation.email}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Chip
                                      color={
                                        invitation.role === 'admin' ? 'secondary' : 'default'
                                      }
                                      size="sm"
                                    >
                                      {invitation.role === 'admin' ? '관리자' : '멤버'}
                                    </Chip>
                                    <span>•</span>
                                    <span>
                                      {(() => {
                                        const expiresAt = new Date(invitation.expires_at)
                                        return !isNaN(expiresAt.getTime()) 
                                          ? expiresAt.toLocaleDateString('ko-KR') + ' 만료'
                                          : '날짜 오류'
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => handleCancelInvitation(invitation.id)}
                              >
                                취소
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 알림 설정 - 추후 구현 예정 */}
        {/*
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
        */}

        {/* 환경 설정 - 추후 구현 예정 */}
        {/*
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

              <Select
                label="테마"
                selectedKeys={['light']}
                isDisabled
              >
                <SelectItem key="light">라이트 모드 (고정)</SelectItem>
              </Select>
            </div>
          </CardBody>
        </Card>
        */}

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

      {/* 멤버 초대 모달 */}
      <Modal isOpen={isInviteModalOpen} onClose={onInviteModalClose}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            멤버 초대
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="이메일"
                placeholder="초대할 사용자의 이메일을 입력하세요"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                type="email"
              />
              
              <Select
                label="역할"
                selectedKeys={[inviteData.role]}
                onSelectionChange={keys => {
                  const selectedRole = Array.from(keys)[0] as string
                  setInviteData(prev => ({ ...prev, role: selectedRole }))
                }}
              >
                <SelectItem key="member">멤버</SelectItem>
                <SelectItem key="admin">관리자</SelectItem>
              </Select>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>참고:</strong> 초대된 사용자는 이메일로 초대 링크를 받게 되며, 
                  7일 이내에 초대를 수락해야 합니다.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={() => {
                setInviteData({ email: '', role: 'member' })
                onInviteModalClose()
              }}
            >
              취소
            </Button>
            <Button 
              color="primary" 
              onPress={handleInviteMember}
              isLoading={inviting}
              isDisabled={inviting || !inviteData.email.trim()}
            >
              초대 발송
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