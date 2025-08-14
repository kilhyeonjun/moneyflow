'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
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
  MoreVertical,
  Settings,
  Trash2,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { Chip } from '@heroui/react'
import {
  formatDateSafe,
  calculateExpirationDays,
  formatExpirationStatus,
  formatCreationDate,
} from '@/lib/utils/date'

// Import server actions
import {
  getUserOrganizations,
  createOrganization as createOrganizationAction,
  deleteOrganization,
} from '@/lib/server-actions/organizations'
import {
  handleServerActionResult,
  useErrorHandler,
} from '@/components/error/ErrorBoundary'
import type { UserOrganization } from '@/lib/types'
import { ValidatedInput, validationRules } from '@/components/form'
import {
  useFormValidation,
  commonValidationRules,
} from '@/hooks/useFormValidation'
import { organizationCreateSchema } from '@/lib/validation/schemas'
// Navigation handler 제거하고 직접 router.push 사용

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

// Organization form data type
interface OrganizationFormData {
  name: string
  description?: string
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [receivedInvitations, setReceivedInvitations] = useState<
    ReceivedInvitation[]
  >([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [processingInvitation, setProcessingInvitation] = useState<
    string | null
  >(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure()
  const [selectedOrganization, setSelectedOrganization] =
    useState<UserOrganization | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { handleError } = useErrorHandler()

  // Form validation setup
  const {
    data: formData,
    errors,
    isValid,
    updateField,
    validateAll,
    reset: resetForm,
    getFieldProps,
  } = useFormValidation<OrganizationFormData>(
    {
      name: commonValidationRules.combine(
        commonValidationRules.required('조직명'),
        commonValidationRules.stringLength(2, 100, '조직명'),
        (value: string) => {
          const nameRegex = /^[가-힣a-zA-Z0-9\s\.\-_\(\)]+$/
          return !nameRegex.test(value)
            ? '조직명에는 한글, 영문, 숫자, 공백, 괄호, 하이픈, 언더스코어, 마침표만 사용할 수 있습니다'
            : null
        }
      ),
      description: (value: string) => {
        if (value && value.length > 500) {
          return '조직 설명은 500자 이하여야 합니다'
        }
        return null
      },
    },
    {
      initialData: { name: '', description: '' },
      realTimeValidation: true,
      mode: 'onChange',
    }
  )

  useEffect(() => {
    fetchOrganizations()
    // TODO: Implement invitation server actions
    // loadReceivedInvitations()
  }, [])

  // 디버깅용: form validation 상태 추적
  useEffect(() => {
    console.log('Form validation state changed:', {
      formData,
      errors,
      isValid,
    })
  }, [formData, errors, isValid])

  const fetchOrganizations = async () => {
    setLoading(true)
    try {
      const result = await getUserOrganizations()
      const organizations = handleServerActionResult(result)
      setOrganizations(organizations)
    } catch (error) {
      handleError(error, 'fetchOrganizations')
    } finally {
      setLoading(false)
    }
  }

  const createOrganization = async () => {
    // Form validation
    const { isValid: validationPassed } = validateAll()
    if (!validationPassed) {
      return
    }

    setCreating(true)
    try {
      // Zod schema validation
      const validatedData = organizationCreateSchema.parse({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      })

      // 서버 액션으로 조직 생성
      const orgResult = await createOrganizationAction(validatedData)
      const org = handleServerActionResult(orgResult)

      toast.success('조직이 성공적으로 생성되었습니다!')

      // 목록 새로고침
      await fetchOrganizations()

      // 모달 닫기 및 폼 초기화
      handleModalClose()
    } catch (error) {
      const errorMessage = handleError(error, 'createOrganization')
      if (errorMessage) {
        toast.error(errorMessage)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleModalClose = () => {
    onClose()
    resetForm({ name: '', description: '' })
  }

  // TODO: Implement invitation server actions
  /*
  const loadReceivedInvitations = async () => {
    try {
      setInvitationsLoading(true)
      // TODO: Replace with server action
    } catch (error) {
      console.error('받은 초대 로드 실패:', error)
    } finally {
      setInvitationsLoading(false)
    }
  }

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingInvitation(invitationId)
      // TODO: Replace with server action
    } catch (error: any) {
      console.error(`초대 ${action} 실패:`, error)
      toast.error(error.message)
    } finally {
      setProcessingInvitation(null)
    }
  }
  */

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

  const selectOrganization = async (orgId: string) => {
    try {
      const targetUrl = `/org/${orgId}/dashboard`
      
      // 개발 환경에서 네비게이션 정보 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log('[NAVIGATION_START]', { orgId, targetUrl })
      }

      // 직접 router.push 사용 (더 안정적)
      router.push(targetUrl)
      
      // 성공적으로 실행되었음을 개발 환경에서 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log('[NAVIGATION_COMPLETED]', { orgId, targetUrl })
      }

    } catch (error) {
      console.error('[NAVIGATION_ERROR]', error)
      toast.error('페이지 이동 중 오류가 발생했습니다.')
      
      // 대체 방법으로 window.location 사용
      try {
        window.location.href = `/org/${orgId}/dashboard`
      } catch (fallbackError) {
        console.error('[NAVIGATION_FALLBACK_ERROR]', fallbackError)
        toast.error('페이지 이동에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.')
      }
    }
  }

  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) return

    setDeleting(true)
    try {
      // 서버 액션으로 조직 삭제
      const data = handleServerActionResult(
        await deleteOrganization(selectedOrganization.id)
      )

      toast.success('조직이 성공적으로 삭제되었습니다.')
      onDeleteModalClose()
      setSelectedOrganization(null)

      // 조직 목록 새로고침
      await fetchOrganizations()
    } catch (error: any) {
      const errorMessage = handleError(error, 'handleDeleteOrganization')
      if (errorMessage) {
        toast.error(errorMessage)
      }
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteModal = (org: UserOrganization, event: React.MouseEvent) => {
    event.stopPropagation() // 카드 클릭 이벤트 방지
    setSelectedOrganization(org)
    onDeleteModalOpen()
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

        {/* 받은 초대 섹션 - TODO: Implement invitation server actions */}
        {false && receivedInvitations.length > 0 && (
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
                  <p className="text-sm text-gray-600">
                    초대 목록을 불러오는 중...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedInvitations.map(invitation => {
                    const expiration = calculateExpirationDays(
                      invitation.expiresAt
                    )
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
                              <h4 className="font-semibold">
                                {invitation.organization.name}
                              </h4>
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
                            onPress={() => {
                              /* TODO: Implement invitation actions */
                            }}
                            isLoading={isProcessing}
                            isDisabled={
                              true /* TODO: Enable after implementing invitation server actions */
                            }
                          >
                            수락
                          </Button>
                          <Button
                            color="danger"
                            variant="bordered"
                            size="sm"
                            startContent={<XCircle className="w-4 h-4" />}
                            onPress={() => {
                              /* TODO: Implement invitation actions */
                            }}
                            isLoading={isProcessing}
                            isDisabled={
                              true /* TODO: Enable after implementing invitation server actions */
                            }
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
              <div
                key={org.id}
                className="cursor-pointer"
                onClick={() => selectOrganization(org.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectOrganization(org.id)
                  }
                }}
                aria-label={`${org.name} 조직으로 이동`}
              >
                <Card
                  className="hover:shadow-lg transition-shadow relative"
                >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {org.createdAt
                          ? formatCreationDate(org.createdAt.toISOString())
                          : '날짜 없음'}
                      </p>
                    </div>
                    {/* Owner인 경우만 드롭다운 메뉴 표시 */}
                    {org.membershipRole === 'owner' && (
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-gray-500 hover:text-gray-700"
                            onClick={e => e.stopPropagation()}
                            data-dropdown-trigger="true"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="조직 관리">
                          <DropdownItem
                            key="settings"
                            startContent={<Settings className="w-4 h-4" />}
                            onPress={() => {
                              router.push(`/org/${org.id}/settings`)
                            }}
                          >
                            설정
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<Trash2 className="w-4 h-4" />}
                            onPress={() => {
                              setSelectedOrganization(org)
                              onDeleteModalOpen()
                            }}
                          >
                            삭제
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  {org.description && (
                    <p className="text-gray-600 text-sm">{org.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Chip
                      color={getRoleColor(org.membershipRole) as any}
                      variant="flat"
                      size="sm"
                    >
                      {getRoleDisplayName(org.membershipRole)}
                    </Chip>
                  </div>
                </CardBody>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* 조직 삭제 확인 모달 */}
        <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
          <ModalContent>
            <ModalHeader className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-orange-600" />
              조직 삭제
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <p>
                  정말로{' '}
                  <strong>&quot;{selectedOrganization?.name}&quot;</strong>{' '}
                  조직을 삭제하시겠습니까?
                </p>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-orange-800 font-medium mb-2">
                    ⚠️ 주의사항
                  </p>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• 조직의 모든 거래 내역이 삭제됩니다</li>
                    <li>• 조직의 모든 카테고리가 삭제됩니다</li>
                    <li>• 조직의 모든 결제수단이 삭제됩니다</li>
                    <li>• 조직의 모든 멤버가 제거됩니다</li>
                    <li>• 대기 중인 초대가 모두 취소됩니다</li>
                    <li>• 이 작업은 되돌릴 수 없습니다</li>
                  </ul>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-800 font-medium text-sm">
                    <strong>참고:</strong> 조직을 삭제하면 위의 모든 데이터가
                    영구적으로 삭제되며 복구할 수 없습니다.
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onDeleteModalClose}>
                취소
              </Button>
              <Button
                color="warning"
                onPress={handleDeleteOrganization}
                startContent={<Trash2 className="w-4 h-4" />}
                isLoading={deleting}
                isDisabled={deleting}
              >
                조직 삭제
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* 조직 생성 모달 */}
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalContent>
            <ModalHeader>새 조직 만들기</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <ValidatedInput
                  label="조직 이름"
                  placeholder="예: 김씨 가족, ABC 팀"
                  value={formData.name}
                  onValueChange={value => updateField('name', value)}
                  validation={getFieldProps('name').validation}
                  error={errors.name}
                  isRequired
                  realTimeValidation
                  autoFocus
                />
                <ValidatedInput
                  label="설명 (선택사항)"
                  placeholder="조직에 대한 간단한 설명"
                  value={formData.description || ''}
                  onValueChange={value => updateField('description', value)}
                  validation={getFieldProps('description').validation}
                  error={errors.description}
                  realTimeValidation
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={handleModalClose}
                disabled={creating}
              >
                취소
              </Button>
              <Button
                color="primary"
                onPress={() => {
                  console.log('Button pressed - Debug info:', {
                    isValid,
                    creating,
                    formData,
                    errors,
                    disabled: !isValid || creating,
                  })
                  createOrganization()
                }}
                isLoading={creating}
                disabled={!isValid || creating}
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
