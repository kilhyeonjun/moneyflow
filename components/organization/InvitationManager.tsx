'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Avatar,
  Chip,
  Divider,
} from '@heroui/react'
import {
  Plus,
  Users,
  Mail,
  Trash2,
  XCircle,
  Copy,
  Calendar,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/utils/toast'
import { LoadingSpinner } from '@/components/ui/LoadingStates'
import { getOrganizationData, createInvitation, cancelInvitation } from '@/lib/server-actions/invitations'

// Import Prisma types directly
import type { OrganizationMember, OrganizationInvitation } from '@prisma/client'

// Type aliases for compatibility
type Member = OrganizationMember
type Invitation = OrganizationInvitation

interface InvitationManagerProps {
  organizationId: string
  organizationName: string
}

export default function InvitationManager({
  organizationId,
  organizationName,
}: InvitationManagerProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)

      // 사용자 인증 상태 확인 (Supabase Auth 유지)
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        showToast.error('사용자 인증에 실패했습니다.')
        return
      }

      if (!user) {
        showToast.error('로그인이 필요합니다.')
        return
      }

      // 서버 액션으로 조직 데이터 로드
      const result = await getOrganizationData(organizationId)

      if (!result.success) {
        throw new Error(result.error || '조직 데이터를 불러오는데 실패했습니다')
      }

      const data = result.data
      if (data) {
        setMembers(data.members || [])
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      showToast.error(`데이터 로드 실패: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      showToast.error('이메일을 입력해주세요')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      showToast.error('올바른 이메일 형식을 입력해주세요')
      return
    }

    try {
      setInviting(true)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast.error('로그인이 필요합니다')
        return
      }

      const result = await createInvitation({
        organizationId,
        email: inviteEmail,
        role: inviteRole,
      })

      if (!result.success) {
        throw new Error(result.error || '초대 발송에 실패했습니다')
      }

      showToast.success('초대를 발송했습니다')
      setInviteEmail('')
      setInviteRole('member')
      onClose()
      loadData() // Reload data to show new invitation
    } catch (error: any) {
      console.error('초대 발송 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '초대 발송 중 오류가 발생했습니다.'
      showToast.error(errorMessage)
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showToast.error('로그인이 필요합니다')
        return
      }

      const result = await cancelInvitation(invitationId, organizationId)

      if (!result.success) {
        throw new Error(result.error || '초대 취소에 실패했습니다')
      }

      showToast.success('초대를 취소했습니다')
      loadData() // Reload data to update invitation list
    } catch (error: any) {
      console.error('초대 취소 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '초대 취소 중 오류가 발생했습니다.'
      showToast.error(errorMessage)
    }
  }

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(inviteUrl)
    showToast.success('초대 링크가 복사되었습니다')
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

  const getInvitationStatus = (invitation: Invitation) => {
    const isExpired = new Date(invitation.expiresAt) < new Date()
    if (isExpired) return { text: '만료됨', color: 'danger' }

    const expiresIn = Math.ceil(
      (new Date(invitation.expiresAt).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    )

    if (expiresIn <= 1) return { text: '곧 만료', color: 'danger' }
    if (expiresIn <= 3) return { text: `${expiresIn}일 남음`, color: 'warning' }
    return { text: `${expiresIn}일 남음`, color: 'success' }
  }

  if (loading) {
    return <LoadingSpinner label="멤버 정보를 불러오는 중..." />
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold">조직 멤버</h2>
                <p className="text-sm text-gray-600">
                  {organizationName} 멤버 관리
                </p>
              </div>
            </div>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={onOpen}
            >
              멤버 초대
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* 현재 멤버 목록 */}
            <div>
              <h3 className="font-medium mb-3">
                현재 멤버 ({members.length}명)
              </h3>
              <div className="space-y-3">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.userId}
                        size="sm"
                        className="bg-blue-100 text-blue-600"
                      />
                      <div>
                        <p className="font-medium">{member.userId}</p>
                        <p className="text-sm text-gray-600">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(
                            'ko-KR'
                          ) : '-'}{' '}
                          가입
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        color={getRoleColor(member.role) as any}
                        variant="flat"
                        size="sm"
                      >
                        {getRoleDisplayName(member.role)}
                      </Chip>
                      {member.role !== 'owner' && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          startContent={<Trash2 className="w-3 h-3" />}
                        >
                          제거
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 대기 중인 초대 목록 */}
            {invitations.length > 0 && (
              <div>
                <Divider className="my-4" />
                <h3 className="font-medium mb-3">
                  대기 중인 초대 (
                  {invitations.filter(inv => inv.status === 'pending').length}
                  개)
                </h3>
                <div className="space-y-3">
                  {invitations
                    .filter(inv => inv.status === 'pending')
                    .map(invitation => {
                      const status = getInvitationStatus(invitation)
                      return (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={invitation.email}
                              size="sm"
                              className="bg-yellow-100 text-yellow-600"
                            />
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {new Date(
                                    invitation.createdAt
                                  ).toLocaleDateString('ko-KR')}{' '}
                                  초대됨
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip
                              color={getRoleColor(invitation.role) as any}
                              variant="flat"
                              size="sm"
                            >
                              {getRoleDisplayName(invitation.role)}
                            </Chip>
                            <Chip
                              color={status.color as any}
                              variant="flat"
                              size="sm"
                              startContent={<Clock className="w-3 h-3" />}
                            >
                              {status.text}
                            </Chip>
                            {invitation.token && (
                              <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                startContent={<Copy className="w-3 h-3" />}
                                onPress={() =>
                                  copyInviteLink(invitation.token!)
                                }
                              >
                                링크 복사
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              startContent={<XCircle className="w-3 h-3" />}
                              onPress={() =>
                                handleCancelInvitation(invitation.id)
                              }
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 초대 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <span>멤버 초대</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="이메일 주소"
                placeholder="초대할 사용자의 이메일을 입력하세요"
                value={inviteEmail}
                onValueChange={setInviteEmail}
                startContent={<Mail className="w-4 h-4 text-gray-400" />}
              />

              <Select
                label="역할"
                selectedKeys={[inviteRole]}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setInviteRole(selectedKey)
                }}
              >
                <SelectItem key="member">멤버 - 기본 권한</SelectItem>
                <SelectItem key="admin">관리자 - 멤버 관리 권한</SelectItem>
              </Select>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  초대 링크는 7일 후 자동으로 만료됩니다. 초대받은 사용자는
                  이메일로 받은 링크를 통해 조직에 참여할 수 있습니다.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose} isDisabled={inviting}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleSendInvitation}
              isLoading={inviting}
              startContent={!inviting && <Mail className="w-4 h-4" />}
            >
              초대 발송
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
