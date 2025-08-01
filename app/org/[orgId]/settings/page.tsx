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
  Tag,
  FolderTree,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import HierarchicalCategorySelect from '@/components/ui/HierarchicalCategorySelect'
import { formatCategoryDisplay } from '@/lib/category-utils'

// Import server actions
import {
  getSettingsData,
  getOrganizationInvitations,
  updateUserProfile,
  resendInvitation,
} from '@/lib/server-actions/settings'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createDefaultCategories,
} from '@/lib/server-actions/categories'
import {
  updateOrganization,
  createInvitation,
  cancelInvitation,
} from '@/lib/server-actions/organizations'
import { handleServerActionResult } from '@/components/error/ErrorBoundary'
import type { Category, Organization, OrganizationMember } from '@/lib/types'

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
  createdAt: Date
  expiresAt: Date
  organization: { name: string }
}

// Settings types - 추후 구현 예정
// type SettingsType = {
//   notifications: {
//     email: boolean
//     push: boolean
//     transactions: boolean
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
    onClose: onInviteModalClose,
  } = useDisclosure()
  const {
    isOpen: isCategoryModalOpen,
    onOpen: onCategoryModalOpen,
    onClose: onCategoryModalClose,
  } = useDisclosure()
  const {
    isOpen: isEditCategoryModalOpen,
    onOpen: onEditCategoryModalOpen,
    onClose: onEditCategoryModalClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteCategoryModalOpen,
    onOpen: onDeleteCategoryModalOpen,
    onClose: onDeleteCategoryModalClose,
  } = useDisclosure()

  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<
    'owner' | 'admin' | 'member' | null
  >(null)

  // 초대 모달 상태
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member',
  })
  const [inviting, setInviting] = useState(false)

  // 카테고리 모달 상태
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  )
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    transactionType: 'expense' as 'income' | 'expense' | 'transfer',
    icon: '',
    color: '#3B82F6',
    parentId: '',
  })
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    'income' | 'expense' | 'transfer'
  >('expense')

  // Settings state - 추후 구현 예정
  // const [settings, setSettings] = useState({
  //   notifications: {
  //     email: true,
  //     push: false,
  //     transactions: true,
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

      // 서버 액션으로 설정 데이터 로드
      try {
        const data = handleServerActionResult(await getSettingsData(orgId))
        const { organization, members, userProfile, currentUserRole } = data

        // 상태 업데이트
        setOrganization(organization)
        setMembers(members || [])
        setUserProfile(userProfile)
        setCurrentUserRole(
          currentUserRole as 'owner' | 'admin' | 'member' | null
        )

        // 편집 폼 데이터 초기화
        setEditProfileData({
          full_name: userProfile?.full_name || '',
          avatar_url: userProfile?.avatar_url || '',
        })

        setEditOrgData({
          name: organization?.name || '',
          description: organization?.description || '',
        })

        // 카테고리와 초대 목록을 병렬로 로드
        await Promise.all([
          loadCategories(orgId),
          currentUserRole === 'admin' || currentUserRole === 'owner'
            ? loadInvitations(orgId)
            : Promise.resolve(),
        ])
      } catch (error) {
        if (error instanceof Error && error.message === 'FORBIDDEN') {
          router.push('/login')
          return
        }
        throw error // re-throw for Error Boundary
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvitations = async (organizationId: string) => {
    try {
      const data = handleServerActionResult(
        await getOrganizationInvitations(organizationId)
      )
      setInvitations(data as Invitation[])
    } catch (error) {
      console.error('초대 목록 로드 실패:', error)
    }
  }

  const loadCategories = async (organizationId: string) => {
    try {
      const data = handleServerActionResult(await getCategories(organizationId))
      setCategories(data)
    } catch (error) {
      console.error('카테고리 로드 실패:', error)
      toast.error('카테고리를 불러오는데 실패했습니다.')
    }
  }

  const handleInviteMember = async () => {
    // 권한 검증
    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      toast.error('멤버 초대 권한이 없습니다.')
      return
    }

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

      // 서버 액션으로 초대 생성
      const data = handleServerActionResult(
        await createInvitation({
          organizationId: orgId,
          email: inviteData.email,
          role: inviteData.role,
        })
      )

      toast.success('초대가 성공적으로 발송되었습니다!')

      // 초대 목록 새로고침
      await loadInvitations(orgId)

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
      // 서버 액션으로 초대 취소
      const data = handleServerActionResult(
        await cancelInvitation(invitationId, orgId)
      )

      toast.success('초대가 취소되었습니다.')

      // 초대 목록 새로고침
      await loadInvitations(orgId)
    } catch (error: any) {
      console.error('초대 취소 실패:', error)
      toast.error(error.message || '초대 취소에 실패했습니다.')
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
      // 서버 액션으로 프로필 업데이트
      const data = handleServerActionResult(
        await updateUserProfile(editProfileData)
      )

      // UI 업데이트
      setUserProfile(prev =>
        prev
          ? {
              ...prev,
              full_name: editProfileData.full_name,
              avatar_url: editProfileData.avatar_url,
            }
          : null
      )

      setIsEditingProfile(false)
      toast.success('프로필이 업데이트되었습니다.')
    } catch (error: any) {
      console.error('프로필 업데이트 실패:', error)
      toast.error(error.message || '프로필 업데이트에 실패했습니다.')
    }
  }

  const handleUpdateOrganization = async () => {
    // 권한 검증
    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      toast.error('조직 정보 수정 권한이 없습니다.')
      return
    }

    if (!orgId) {
      toast.error('조직 ID가 없습니다.')
      return
    }

    try {
      // 서버 액션으로 조직 업데이트
      const data = handleServerActionResult(
        await updateOrganization({
          id: orgId,
          name: editOrgData.name,
          description: editOrgData.description,
        })
      )

      // UI 업데이트
      setOrganization(prev =>
        prev
          ? {
              ...prev,
              name: editOrgData.name,
              description: editOrgData.description,
            }
          : null
      )

      setIsEditingOrganization(false)
      toast.success('조직 정보가 업데이트되었습니다.')
    } catch (error: any) {
      console.error('조직 업데이트 실패:', error)
      toast.error(error.message || '조직 정보 업데이트에 실패했습니다.')
    }
  }

  const handleExportData = async () => {
    // 권한 검증 - owner만 가능
    if (!currentUserRole || currentUserRole !== 'owner') {
      toast.error('데이터 내보내기 권한이 없습니다.')
      return
    }

    try {
      if (!orgId) {
        toast.error('조직을 선택하세요.')
        return
      }

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

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
        type: 'application/json',
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
    // 권한 검증 - owner만 가능
    if (!currentUserRole || currentUserRole !== 'owner') {
      toast.error('계정 삭제 권한이 없습니다.')
      return
    }

    try {
      // 실제 구현에서는 계정 삭제 로직
      toast.success('계정 삭제 요청이 처리되었습니다.')
      onClose()
    } catch (error) {
      toast.error('계정 삭제에 실패했습니다.')
    }
  }

  // 카테고리 관련 함수들
  const handleCreateCategory = async () => {
    // 권한 검증
    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      toast.error('카테고리 생성 권한이 없습니다.')
      return
    }

    if (!categoryFormData.name.trim()) {
      toast.error('카테고리명을 입력하세요.')
      return
    }

    setCategoryLoading(true)
    try {
      const data = handleServerActionResult(
        await createCategory({
          name: categoryFormData.name,
          transactionType: categoryFormData.transactionType,
          icon: categoryFormData.icon,
          color: categoryFormData.color,
          parentId: categoryFormData.parentId || undefined,
          organizationId: orgId,
          level: 0, // Will be calculated by server action
        })
      )

      toast.success('카테고리가 성공적으로 생성되었습니다!')
      onCategoryModalClose()
      setCategoryFormData({
        name: '',
        transactionType: 'expense',
        icon: '',
        color: '#3B82F6',
        parentId: '',
      })

      // 카테고리 목록 새로고침
      await loadCategories(orgId)
    } catch (error: any) {
      console.error('카테고리 생성 실패:', error)
      toast.error(error.message || '카테고리 생성에 실패했습니다.')
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setCategoryFormData({
      name: category.name,
      transactionType: category.transactionType as
        | 'income'
        | 'expense'
        | 'transfer',
      icon: category.icon || '',
      color: category.color || '#3B82F6',
      parentId: category.parentId || '',
    })
    onEditCategoryModalOpen()
  }

  const handleUpdateCategory = async () => {
    // 권한 검증
    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      toast.error('카테고리 수정 권한이 없습니다.')
      return
    }

    if (!selectedCategory || !categoryFormData.name.trim()) {
      toast.error('카테고리명을 입력하세요.')
      return
    }

    setCategoryLoading(true)
    try {
      const data = handleServerActionResult(
        await updateCategory({
          id: selectedCategory.id,
          name: categoryFormData.name,
          icon: categoryFormData.icon,
          color: categoryFormData.color,
          parentId: categoryFormData.parentId || undefined,
          organizationId: orgId,
        })
      )

      toast.success('카테고리가 성공적으로 수정되었습니다!')
      onEditCategoryModalClose()
      setSelectedCategory(null)

      // 카테고리 목록 새로고침
      await loadCategories(orgId)
    } catch (error: any) {
      console.error('카테고리 수정 실패:', error)
      toast.error(error.message || '카테고리 수정에 실패했습니다.')
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    // 권한 검증
    if (!currentUserRole || !['owner', 'admin'].includes(currentUserRole)) {
      toast.error('카테고리 삭제 권한이 없습니다.')
      return
    }

    if (!selectedCategory) return

    setCategoryLoading(true)
    try {
      const data = handleServerActionResult(
        await deleteCategory(selectedCategory.id, orgId)
      )

      toast.success('카테고리가 성공적으로 삭제되었습니다!')
      onDeleteCategoryModalClose()
      setSelectedCategory(null)

      // 카테고리 목록 새로고침
      await loadCategories(orgId)
    } catch (error: any) {
      console.error('카테고리 삭제 실패:', error)
      toast.error(error.message || '카테고리 삭제에 실패했습니다.')
    } finally {
      setCategoryLoading(false)
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
                value={
                  isEditingProfile
                    ? editProfileData.full_name
                    : userProfile?.full_name || ''
                }
                placeholder="이름을 입력하세요"
                isReadOnly={!isEditingProfile}
                onChange={e =>
                  isEditingProfile &&
                  setEditProfileData(prev => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
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
                <Button size="sm" color="primary" onPress={handleUpdateProfile}>
                  저장
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 조직 설정 - owner/admin만 접근 가능 */}
        {currentUserRole && ['owner', 'admin'].includes(currentUserRole) && (
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
                            onChange={e =>
                              setEditOrgData(prev => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />
                          <Input
                            label="설명"
                            value={editOrgData.description}
                            placeholder="조직 설명을 입력하세요"
                            onChange={e =>
                              setEditOrgData(prev => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-semibold">
                            {organization?.name}
                          </h3>
                          <p className="text-gray-600">
                            {organization?.description}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="light"
                      startContent={<Edit className="w-4 h-4" />}
                      onPress={() =>
                        setIsEditingOrganization(!isEditingOrganization)
                      }
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
                    {members.map(member => {
                      // OrganizationMember now has userId instead of user_id
                      const displayName = `사용자 ${member.userId.slice(0, 8)}`
                      const displayEmail = '이메일 정보 없음'

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" name={displayName} />
                            <div>
                              <p className="font-medium">{displayName}</p>
                              <p className="text-sm text-gray-600">
                                {displayEmail}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.joinedAt
                                  ? new Date(
                                      member.joinedAt
                                    ).toLocaleDateString('ko-KR') + ' 가입'
                                  : '가입일 불명'}
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
                      )
                    })}
                  </div>

                  {/* 초대 목록 */}
                  {invitations.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <h4 className="font-medium mb-3">대기 중인 초대</h4>
                        <div className="space-y-2">
                          {invitations
                            .filter(
                              invitation => invitation.status === 'pending'
                            )
                            .map(invitation => (
                              <div
                                key={invitation.id}
                                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar size="sm" name={invitation.email} />
                                  <div>
                                    <p className="font-medium">
                                      {invitation.email}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Chip
                                        color={
                                          invitation.role === 'admin'
                                            ? 'secondary'
                                            : 'default'
                                        }
                                        size="sm"
                                      >
                                        {invitation.role === 'admin'
                                          ? '관리자'
                                          : '멤버'}
                                      </Chip>
                                      <span>•</span>
                                      <span>
                                        {(() => {
                                          const expiresAt = new Date(
                                            invitation.expiresAt
                                          )
                                          return !isNaN(expiresAt.getTime())
                                            ? expiresAt.toLocaleDateString(
                                                'ko-KR'
                                              ) + ' 만료'
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
                                  onPress={() =>
                                    handleCancelInvitation(invitation.id)
                                  }
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
        )}

        {/* 카테고리 관리 - owner/admin만 접근 가능 */}
        {currentUserRole && ['owner', 'admin'].includes(currentUserRole) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">카테고리 관리</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">거래 카테고리</p>
                    <p className="text-sm text-gray-600">
                      수입, 지출, 이체 카테고리를 관리합니다
                    </p>
                  </div>
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={onCategoryModalOpen}
                  >
                    카테고리 추가
                  </Button>
                </div>

                <Divider />

                {/* 카테고리 타입별 필터 */}
                <div className="flex gap-2">
                  {['expense', 'income', 'transfer'].map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant={
                        selectedTransactionType === type ? 'solid' : 'bordered'
                      }
                      color={
                        selectedTransactionType === type ? 'primary' : 'default'
                      }
                      onPress={() =>
                        setSelectedTransactionType(
                          type as 'income' | 'expense' | 'transfer'
                        )
                      }
                    >
                      {type === 'expense'
                        ? '지출'
                        : type === 'income'
                          ? '수입'
                          : '이체'}
                    </Button>
                  ))}
                </div>

                {/* 카테고리 목록 */}
                <div className="space-y-2">
                  {categories
                    .filter(
                      category =>
                        category.transactionType === selectedTransactionType
                    )
                    .sort(
                      (a, b) =>
                        a.level - b.level || a.name.localeCompare(b.name)
                    )
                    .map(category => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        style={{ paddingLeft: `${category.level * 16 + 12}px` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: category.color || '#3B82F6',
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{category.name}</p>
                              {category.isDefault && (
                                <Chip color="default" size="sm" variant="flat">
                                  기본
                                </Chip>
                              )}
                              {category.level > 1 && (
                                <FolderTree className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              레벨 {category.level}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="light"
                            startContent={<Edit className="w-3 h-3" />}
                            onPress={() => handleEditCategory(category)}
                            isDisabled={category.isDefault ?? false}
                          >
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            startContent={<Trash2 className="w-3 h-3" />}
                            onPress={() => {
                              setSelectedCategory(category)
                              onDeleteCategoryModalOpen()
                            }}
                            isDisabled={category.isDefault ?? false}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))}

                  {categories.filter(
                    c => c.transactionType === selectedTransactionType
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        카테고리가 없습니다
                      </h3>
                      <p className="text-gray-500 mb-4">
                        첫 번째 카테고리를 추가해보세요!
                      </p>
                      <Button color="primary" onPress={onCategoryModalOpen}>
                        카테고리 추가하기
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

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

        {/* 데이터 관리 - owner만 접근 가능 */}
        {currentUserRole === 'owner' && (
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
        )}
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
                <li>• 자산 정보가 삭제됩니다</li>
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
                onChange={e =>
                  setInviteData(prev => ({ ...prev, email: e.target.value }))
                }
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
                  <strong>참고:</strong> 초대된 사용자는 이메일로 초대 링크를
                  받게 되며, 7일 이내에 초대를 수락해야 합니다.
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

      {/* 카테고리 생성 모달 */}
      <Modal isOpen={isCategoryModalOpen} onClose={onCategoryModalClose}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" />새 카테고리 추가
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Select
                label="거래 유형"
                selectedKeys={[categoryFormData.transactionType]}
                onSelectionChange={keys => {
                  const selectedType = Array.from(keys)[0] as
                    | 'income'
                    | 'expense'
                    | 'transfer'
                  setCategoryFormData(prev => ({
                    ...prev,
                    transactionType: selectedType,
                    parentId: '',
                  }))
                }}
                isRequired
              >
                <SelectItem key="expense">지출</SelectItem>
                <SelectItem key="income">수입</SelectItem>
                <SelectItem key="transfer">이체</SelectItem>
              </Select>

              <Input
                label="카테고리명"
                placeholder="카테고리명을 입력하세요"
                value={categoryFormData.name}
                onChange={e =>
                  setCategoryFormData(prev => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                isRequired
              />

              <Select
                label="상위 카테고리"
                placeholder="상위 카테고리 선택 (선택사항)"
                selectedKeys={
                  categoryFormData.parentId ? [categoryFormData.parentId] : []
                }
                onSelectionChange={keys => {
                  const selectedParent = Array.from(keys)[0] as string
                  setCategoryFormData(prev => ({
                    ...prev,
                    parentId: selectedParent,
                  }))
                }}
              >
                {categories
                  .filter(
                    cat =>
                      cat.transactionType ===
                        categoryFormData.transactionType && cat.level < 3 // 3레벨까지만 허용
                  )
                  .map(category => (
                    <SelectItem key={category.id}>
                      {formatCategoryDisplay(category, {
                        showIcons: false,
                        showHierarchySymbols: true,
                        indentSize: 2,
                      })}
                    </SelectItem>
                  ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="아이콘"
                  placeholder="🏠 (선택사항)"
                  value={categoryFormData.icon}
                  onChange={e =>
                    setCategoryFormData(prev => ({
                      ...prev,
                      icon: e.target.value,
                    }))
                  }
                />
                <Input
                  label="색상"
                  type="color"
                  value={categoryFormData.color}
                  onChange={e =>
                    setCategoryFormData(prev => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setCategoryFormData({
                  name: '',
                  transactionType: 'expense',
                  icon: '',
                  color: '#3B82F6',
                  parentId: '',
                })
                onCategoryModalClose()
              }}
            >
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleCreateCategory}
              isLoading={categoryLoading}
              isDisabled={categoryLoading || !categoryFormData.name.trim()}
            >
              추가하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 카테고리 수정 모달 */}
      <Modal
        isOpen={isEditCategoryModalOpen}
        onClose={onEditCategoryModalClose}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            카테고리 수정
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="카테고리명"
                placeholder="카테고리명을 입력하세요"
                value={categoryFormData.name}
                onChange={e =>
                  setCategoryFormData(prev => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                isRequired
              />

              <Select
                label="상위 카테고리"
                placeholder="상위 카테고리 선택 (선택사항)"
                selectedKeys={
                  categoryFormData.parentId ? [categoryFormData.parentId] : []
                }
                onSelectionChange={keys => {
                  const selectedParent = Array.from(keys)[0] as string
                  setCategoryFormData(prev => ({
                    ...prev,
                    parentId: selectedParent,
                  }))
                }}
              >
                {categories
                  .filter(
                    cat =>
                      cat.transactionType ===
                        categoryFormData.transactionType &&
                      cat.level < 3 && // 3레벨까지만 허용
                      cat.id !== selectedCategory?.id // 자기 자신은 제외
                  )
                  .map(category => (
                    <SelectItem key={category.id}>
                      {formatCategoryDisplay(category, {
                        showIcons: false,
                        showHierarchySymbols: true,
                        indentSize: 2,
                      })}
                    </SelectItem>
                  ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="아이콘"
                  placeholder="🏠 (선택사항)"
                  value={categoryFormData.icon}
                  onChange={e =>
                    setCategoryFormData(prev => ({
                      ...prev,
                      icon: e.target.value,
                    }))
                  }
                />
                <Input
                  label="색상"
                  type="color"
                  value={categoryFormData.color}
                  onChange={e =>
                    setCategoryFormData(prev => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setSelectedCategory(null)
                onEditCategoryModalClose()
              }}
            >
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleUpdateCategory}
              isLoading={categoryLoading}
              isDisabled={categoryLoading || !categoryFormData.name.trim()}
            >
              수정하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 카테고리 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteCategoryModalOpen}
        onClose={onDeleteCategoryModalClose}
        size="sm"
      >
        <ModalContent>
          <ModalHeader>카테고리 삭제</ModalHeader>
          <ModalBody>
            <p>
              정말로 &ldquo;<strong>{selectedCategory?.name}</strong>&rdquo;
              카테고리를 삭제하시겠습니까?
            </p>
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">⚠️ 주의사항</p>
              <ul className="text-red-700 text-sm mt-2 space-y-1">
                <li>• 삭제된 카테고리는 복구할 수 없습니다</li>
                <li>• 하위 카테고리가 있는 경우 삭제할 수 없습니다</li>
                <li>• 거래에서 사용 중인 카테고리는 삭제할 수 없습니다</li>
              </ul>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={onDeleteCategoryModalClose}
              disabled={categoryLoading}
            >
              취소
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteCategory}
              isLoading={categoryLoading}
            >
              삭제하기
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
