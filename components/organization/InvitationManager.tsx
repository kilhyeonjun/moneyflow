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
import { supabase } from '@/lib/supabase'
import { showToast } from '@/lib/utils/toast'
import { LoadingSpinner } from '@/components/ui/LoadingStates'

interface Member {
  id: string
  user_id: string
  role: string
  joined_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  token?: string
}

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
      await Promise.all([loadMembers(), loadInvitations()])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      showToast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        id,
        user_id,
        role,
        joined_at
      `
      )
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('멤버 목록 로드 실패:', error)
      return
    }

    setMembers(data || [])
  }

  const loadInvitations = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invitations`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('초대 목록 로드 실패:', error)
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

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        showToast.error('로그인이 필요합니다')
        return
      }

      const response = await fetch(
        `/api/organizations/${organizationId}/invitations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '초대 발송에 실패했습니다')
      }

      showToast.success('초대를 발송했습니다')
      setInviteEmail('')
      setInviteRole('member')
      onClose()
      loadInvitations()
    } catch (error: any) {
      console.error('초대 발송 실패:', error)
      showToast.error(error.message)
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `/api/organizations/${organizationId}/invitations?invitationId=${invitationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        showToast.success('초대를 취소했습니다')
        loadInvitations()
      } else {
        throw new Error('초대 취소에 실패했습니다')
      }
    } catch (error: any) {
      console.error('초대 취소 실패:', error)
      showToast.error(error.message)
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
    const isExpired = new Date(invitation.expires_at) < new Date()
    if (isExpired) return { text: '만료됨', color: 'danger' }

    const expiresIn = Math.ceil(
      (new Date(invitation.expires_at).getTime() - new Date().getTime()) /
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
                        name={member.user_id}
                        size="sm"
                        className="bg-blue-100 text-blue-600"
                      />
                      <div>
                        <p className="font-medium">{member.user_id}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(member.joined_at).toLocaleDateString(
                            'ko-KR'
                          )}{' '}
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
                                    invitation.created_at
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
