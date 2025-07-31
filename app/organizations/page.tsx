'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react'
import {
  Plus,
  Users,
  Building2,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Building,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import toast, { Toaster } from 'react-hot-toast'
import { Chip } from '@heroui/react'
import { formatDateSafe, calculateExpirationDays, formatExpirationStatus, formatCreationDate } from '@/lib/utils/date'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert =
  Database['public']['Tables']['organizations']['Insert']

interface ReceivedInvitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
  organization: {
    id: string
    name: string
    description?: string
  }
  token: string
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDescription, setNewOrgDescription] = useState('')
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const router = useRouter()

  useEffect(() => {
    fetchOrganizations()
    loadReceivedInvitations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // API 라우트를 통해 조직 목록 조회
      const response = await fetch(`/api/organizations?userId=${user.id}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '조직 목록을 불러오는데 실패했습니다')
      }

      const data = await response.json()
      setOrganizations(data || [])
    } catch (error) {
      console.error('조직 목록 조회 실패:', error)
      toast.error('조직 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const createOrganization = async () => {
    if (!newOrgName.trim()) return

    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('사용자 인증이 필요합니다')

      // API 라우트를 통해 조직 생성
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newOrgName.trim(),
          description: newOrgDescription.trim() || null,
          createdBy: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '조직 생성에 실패했습니다')
      }

      const org = await response.json()

      // 기본 카테고리 및 결제수단 생성
      try {
        const initialDataResponse = await fetch(`/api/organizations/${org.id}/initial-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!initialDataResponse.ok) {
          const errorData = await initialDataResponse.json()
          throw new Error(errorData.error || '기본 데이터 생성에 실패했습니다')
        }

        const initialDataResult = await initialDataResponse.json()
        console.log('기본 데이터 생성 완료:', initialDataResult)
        toast.success('조직이 성공적으로 생성되었습니다!')
      } catch (dataError) {
        console.error('기본 데이터 생성 실패:', dataError)
        toast.error('조직은 생성되었지만 기본 데이터 생성에 실패했습니다.')
        // 기본 데이터 생성 실패해도 조직은 생성되었으므로 계속 진행
      }

      // 목록 새로고침
      await fetchOrganizations()

      // 모달 닫기 및 폼 초기화
      onClose()
      setNewOrgName('')
      setNewOrgDescription('')
    } catch (error: any) {
      console.error('조직 생성 실패:', error)
      let errorMessage = '조직 생성에 실패했습니다.'
      if (error?.message?.includes('duplicate')) {
        errorMessage = '이미 존재하는 조직명입니다.'
      } else if (error?.message?.includes('permission')) {
        errorMessage = '조직 생성 권한이 없습니다.'
      } else if (error?.message?.includes('network')) {
        errorMessage = '네트워크 연결을 확인해주세요.'
      }
      toast.error(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const loadReceivedInvitations = async () => {
    try {
      setInvitationsLoading(true)
      console.log('=== 받은 초대 로드 시작 ===')

      // Supabase Auth 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('세션이 없어서 초대 로드를 건너뜁니다')
        return
      }

      console.log('현재 사용자 이메일:', session.user?.email)
      
      const response = await fetch('/api/invitations/received', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      console.log('API 응답 상태:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('받은 초대 데이터:', data)
        setReceivedInvitations(data.invitations || [])
      } else {
        const errorData = await response.json()
        console.error('초대 로드 API 에러:', response.status, errorData)
      }
    } catch (error) {
      console.error('받은 초대 로드 실패:', error)
    } finally {
      setInvitationsLoading(false)
    }
  }

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingInvitation(invitationId)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('로그인이 필요합니다')
        return
      }

      const response = await fetch('/api/invitations/received', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invitationId, action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} invitation`)
      }

      // 초대 목록에서 처리된 초대 제거
      setReceivedInvitations(prev => prev.filter(inv => inv.id !== invitationId))

      if (action === 'accept') {
        toast.success('초대를 수락했습니다!')
        // 조직 목록 새로고침
        await fetchOrganizations()
      } else {
        toast.success('초대를 거절했습니다')
      }
    } catch (error: any) {
      console.error(`초대 ${action} 실패:`, error)
      toast.error(error.message)
    } finally {
      setProcessingInvitation(null)
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner':
        return '소유자'
      case 'admin':
        return '관리자'
      case 'member':
        return '멤버'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'danger'
      case 'admin':
        return 'warning'
      case 'member':
        return 'primary'
      default:
        return 'default'
    }
  }

  const selectOrganization = (orgId: string) => {
    // 새로운 URL 구조로 이동
    router.push(`/org/${orgId}/dashboard`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">조직 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">조직 선택</h1>
            <p className="text-gray-600">
              관리할 조직을 선택하거나 새로운 조직을 생성하세요.
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Plus className="h-5 w-5" />}
            onPress={onOpen}
          >
            새 조직 만들기
          </Button>
        </div>

        {/* 받은 초대 섹션 */}
        {receivedInvitations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">받은 초대</h3>
                <Chip size="sm" color="primary" variant="flat">
                  {receivedInvitations.length}
                </Chip>
              </div>
            </CardHeader>
            <CardBody>
              {invitationsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">초대 목록을 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedInvitations.map(invitation => {
                    const expiration = calculateExpirationDays(invitation.expiresAt)
                    const isProcessing = processingInvitation === invitation.id

                    return (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Building className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{invitation.organization.name}</h4>
                              <Chip
                                color={getRoleColor(invitation.role) as any}
                                variant="flat"
                                size="sm"
                              >
                                {getRoleDisplayName(invitation.role)}
                              </Chip>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="w-3 h-3" />
                              <span>{invitation.email}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatExpirationStatus(invitation.expiresAt)}
                                </span>
                              </div>
                            </div>
                            {invitation.organization.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {invitation.organization.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            color="success"
                            size="sm"
                            startContent={<CheckCircle className="w-4 h-4" />}
                            onPress={() => handleInvitationAction(invitation.id, 'accept')}
                            isLoading={isProcessing}
                            isDisabled={isProcessing || !expiration.isValid || expiration.isExpired}
                          >
                            수락
                          </Button>
                          <Button
                            color="danger"
                            variant="bordered"
                            size="sm"
                            startContent={<XCircle className="w-4 h-4" />}
                            onPress={() => handleInvitationAction(invitation.id, 'reject')}
                            isLoading={isProcessing}
                            isDisabled={isProcessing || !expiration.isValid || expiration.isExpired}
                          >
                            거절
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              조직이 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
              첫 번째 조직을 만들어 MoneyFlow를 시작하세요.
            </p>
            <Button
              color="primary"
              size="lg"
              startContent={<Plus className="h-5 w-5" />}
              onPress={onOpen}
            >
              조직 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(org => (
              <Card
                key={org.id}
                isPressable
                onPress={() => selectOrganization(org.id)}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatCreationDate(org.created_at)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  {org.description && (
                    <p className="text-gray-600 text-sm">{org.description}</p>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* 조직 생성 모달 */}
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalContent>
            <ModalHeader>새 조직 만들기</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="조직 이름"
                  placeholder="예: 김씨 가족, ABC 팀"
                  value={newOrgName}
                  onValueChange={setNewOrgName}
                  isRequired
                />
                <Input
                  label="설명 (선택사항)"
                  placeholder="조직에 대한 간단한 설명"
                  value={newOrgDescription}
                  onValueChange={setNewOrgDescription}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} disabled={creating}>
                취소
              </Button>
              <Button
                color="primary"
                onPress={createOrganization}
                isLoading={creating}
                disabled={!newOrgName.trim()}
              >
                생성하기
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
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </div>
  )
}