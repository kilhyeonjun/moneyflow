'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Avatar,
  Chip,
  Divider,
} from '@heroui/react'
import {
  Users,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Building,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/utils/toast'
import { LoadingSpinner, PageLoading } from '@/components/ui/LoadingStates'
import {
  getInvitationByToken,
  acceptInvitation,
} from '@/lib/server-actions/organizations'
import {
  handleServerActionResult,
  useErrorHandler,
} from '@/components/error/ErrorBoundary'

interface InvitationData {
  id: string
  email: string
  role: string
  organizationName: string
  expiresAt: Date
  isExpired: boolean
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { handleError } = useErrorHandler()

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuth()
    loadInvitation()
  }, [token])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      setInvitation(
        handleServerActionResult(await getInvitationByToken(token)) || null
      )
    } catch (error: any) {
      const errorMessage = handleError(error, 'loadInvitation')
      if (errorMessage) {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInvitation = async (action: 'accept' | 'reject') => {
    if (!user) {
      showToast.error('로그인이 필요합니다')
      router.push(`/login?redirect=/invite/${token}`)
      return
    }

    try {
      setProcessing(true)

      if (action === 'accept') {
        const data = handleServerActionResult(await acceptInvitation(token))

        showToast.success('초대를 수락했습니다!')
        router.push('/organizations')
      } else {
        // For reject, we'll just redirect for now since there's no server action for it
        showToast.success('초대를 거절했습니다')
        router.push('/')
      }
    } catch (error: any) {
      const errorMessage = handleError(error, `handleInvitation-${action}`)
      if (errorMessage) {
        showToast.error(errorMessage)
      }
    } finally {
      setProcessing(false)
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

  if (loading) {
    return <PageLoading message="초대 정보를 불러오는 중..." />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardBody className="text-center p-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              초대를 찾을 수 없습니다
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button color="primary" onPress={() => router.push('/')}>
              홈으로 이동
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  const expiresAt = invitation.expiresAt
  const isValidDate = !isNaN(expiresAt.getTime())
  const isExpired = invitation.isExpired
  const expiresIn = isValidDate
    ? Math.ceil(
        (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <Building className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">조직 초대</h1>
          <p className="text-gray-600">MoneyFlow 조직에 초대되었습니다</p>
        </div>

        {/* 초대 정보 카드 */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <Avatar
                name={invitation.organizationName}
                className="bg-blue-100 text-blue-600"
              />
              <div>
                <h2 className="text-xl font-semibold">
                  {invitation.organizationName}
                </h2>
              </div>
            </div>
          </CardHeader>

          <Divider />

          <CardBody className="pt-6">
            <div className="space-y-4">
              {/* 초대 받은 이메일 */}
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">초대 받은 이메일</p>
                  <p className="font-medium">{invitation.email}</p>
                </div>
              </div>

              {/* 역할 */}
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">부여될 역할</p>
                  <Chip
                    color={getRoleColor(invitation.role) as any}
                    variant="flat"
                    size="sm"
                  >
                    {getRoleDisplayName(invitation.role)}
                  </Chip>
                </div>
              </div>

              {/* 만료 정보 */}
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">초대 만료</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">
                      {isValidDate
                        ? expiresAt.toLocaleDateString('ko-KR')
                        : '알 수 없는 날짜'}
                    </p>
                    {!isExpired && (
                      <Chip
                        color={
                          expiresIn <= 1
                            ? 'danger'
                            : expiresIn <= 3
                              ? 'warning'
                              : 'success'
                        }
                        variant="flat"
                        size="sm"
                        startContent={<Clock className="h-3 w-3" />}
                      >
                        {expiresIn}일 남음
                      </Chip>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 로그인 필요 안내 */}
        {!user && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardBody className="text-center">
              <p className="text-blue-800 mb-4">
                초대를 수락하려면 로그인이 필요합니다
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  color="primary"
                  onPress={() =>
                    router.push(`/login?redirect=/invite/${token}`)
                  }
                >
                  로그인
                </Button>
                <Button
                  variant="bordered"
                  onPress={() =>
                    router.push(`/signup?redirect=/invite/${token}`)
                  }
                >
                  회원가입
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 만료된 초대 */}
        {isExpired && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardBody className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                초대가 만료되었습니다
              </h3>
              <p className="text-red-600">
                이 초대는{' '}
                {isValidDate
                  ? expiresAt.toLocaleDateString('ko-KR')
                  : '알 수 없는 날짜'}
                에 만료되었습니다. 새로운 초대를 요청해주세요.
              </p>
            </CardBody>
          </Card>
        )}

        {/* 액션 버튼 */}
        {user && !isExpired && (
          <div className="flex gap-4 justify-center">
            <Button
              color="success"
              size="lg"
              startContent={<CheckCircle className="h-5 w-5" />}
              onPress={() => handleInvitation('accept')}
              isLoading={processing}
              isDisabled={processing}
            >
              초대 수락
            </Button>
            <Button
              color="danger"
              variant="bordered"
              size="lg"
              startContent={<XCircle className="h-5 w-5" />}
              onPress={() => handleInvitation('reject')}
              isLoading={processing}
              isDisabled={processing}
            >
              초대 거절
            </Button>
          </div>
        )}

        {/* 도움말 */}
        <Card className="mt-8 bg-gray-50">
          <CardBody>
            <h3 className="font-semibold mb-2">초대에 대해</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 초대를 수락하면 해당 조직의 멤버가 됩니다</li>
              <li>• 조직의 재정 데이터를 공유하고 관리할 수 있습니다</li>
              <li>• 언제든지 조직에서 탈퇴할 수 있습니다</li>
              <li>• 초대는 7일 후 자동으로 만료됩니다</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
