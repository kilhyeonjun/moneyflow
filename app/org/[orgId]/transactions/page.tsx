'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem,
  Textarea,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react'
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Calendar,
  Filter,
  Shield,
  Building,
  Banknote,
  CreditCard,
  Building2,
  Wallet,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
// Import server actions and types
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/server-actions/transactions'
import { handleServerActionResult } from '@/components/error/ErrorBoundary'
import PaymentMethodSelect from '@/components/payment-methods/PaymentMethodSelect'
import ValidatedInput from '@/components/form/ValidatedInput'
import ValidatedSelect from '@/components/form/ValidatedSelect'
import { useFormValidation, commonValidationRules, type FieldValidation } from '@/hooks/useFormValidation'
import { 
  transactionCreateFormSchema, 
  transactionUpdateFormSchema,
  validateSchema 
} from '@/lib/validation/schemas'
import { z } from 'zod'
import type {
  TransactionCreateInput,
  TransactionUpdateInput,
  transformTransactionForFrontend,
} from '@/lib/types'

// Use the actual transformation type from server actions
type TransactionForFrontend = ReturnType<typeof transformTransactionForFrontend>

// Form data types
interface TransactionFormData {
  amount: string
  description: string
  transactionDate: string
  transactionType: string
  paymentMethodId: string
}

/**
 * Zod 스키마를 useFormValidation에서 사용할 수 있는 FieldValidation 형태로 변환하는 헬퍼 함수
 */
function createFieldValidationFromZodSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): FieldValidation<any> {
  const shape = schema.shape
  const validationRules: any = {}

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    validationRules[fieldName] = (value: any) => {
      try {
        // 개별 필드 검증을 위한 safeParse 사용
        const fieldResult = (fieldSchema as any).safeParse(value)
        if (!fieldResult.success) {
          // 첫 번째 에러 메시지 반환
          return fieldResult.error.errors[0]?.message || '유효하지 않은 값입니다'
        }
        return null
      } catch (error) {
        return '검증 중 오류가 발생했습니다'
      }
    }
  }

  return validationRules
}

// transactionCreateFormSchema에서 organizationId 제외한 클라이언트 폼 스키마
const clientTransactionCreateFormSchema = transactionCreateFormSchema.omit({ organizationId: true })
const clientTransactionUpdateFormSchema = transactionUpdateFormSchema.omit({ organizationId: true, id: true })

// Zod schema 기반 validation rules 생성
const createZodValidationRules = createFieldValidationFromZodSchema(clientTransactionCreateFormSchema)
const editZodValidationRules = createFieldValidationFromZodSchema(clientTransactionUpdateFormSchema)

export default function TransactionsPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string

  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionForFrontend | null>(null)

  const [transactions, setTransactions] = useState<TransactionForFrontend[]>([])
  const [error, setError] = useState<string | null>(null)

  // Create form validation 훅 (Zod schema 기반)
  const createForm = useFormValidation<TransactionFormData>(createZodValidationRules, {
    initialData: {
      amount: '',
      description: '',
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: 'expense',
      paymentMethodId: '',
    },
    mode: 'onChange',
    realTimeValidation: true
  })

  // Edit form validation 훅 (Zod schema 기반)
  const editForm = useFormValidation<TransactionFormData>(editZodValidationRules, {
    initialData: {
      amount: '',
      description: '',
      transactionDate: '',
      transactionType: 'expense',
      paymentMethodId: '',
    },
    mode: 'onChange',
    realTimeValidation: true
  })

  useEffect(() => {
    if (orgId) {
      loadTransactions(orgId)
    }
  }, [orgId])

  const loadTransactions = async (organizationId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load transactions using server actions
      const transactionsResult = await getTransactions(organizationId)

      try {
        const transactionsData = handleServerActionResult(transactionsResult)

        if (process.env.NODE_ENV === 'development') {
          console.log('로드된 거래 데이터:', transactionsData)
        }

        setTransactions(transactionsData ? transactionsData.data : [])
      } catch (error) {
        if (error instanceof Error && error.message === 'FORBIDDEN') {
          setError('이 조직에 접근할 권한이 없습니다.')
          return
        }
        throw error // re-throw for Error Boundary
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : '데이터를 불러오는데 실패했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('거래 생성 시도 - formData:', createForm.data)
    }

    // Form validation 수행
    const { isValid, errors } = createForm.validateAll()
    if (!isValid) {
      const errorMessages = Object.values(errors).join(' ')
      toast.error(errorMessages)
      return
    }

    // Zod schema를 사용한 최종 데이터 검증
    const formDataWithOrgId = {
      ...createForm.data,
      organizationId: orgId
    }
    
    const validationResult = transactionCreateFormSchema.safeParse(formDataWithOrgId)
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message).join(' ')
      toast.error(errorMessages || '필수 정보를 모두 입력해주세요')
      return
    }

    setCreating(true)
    try {
      // 검증된 데이터 사용 (Zod transform 적용됨)
      const requestData: TransactionCreateInput = {
        organizationId: validationResult.data.organizationId,
        amount: validationResult.data.amount,
        description: validationResult.data.description,
        transactionDate: validationResult.data.transactionDate,
        transactionType: validationResult.data.transactionType,
        paymentMethodId: validationResult.data.paymentMethodId,
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Server action 요청 데이터:', requestData)
      }

      try {
        const data = handleServerActionResult(
          await createTransaction(requestData)
        )

        toast.success('거래가 성공적으로 추가되었습니다!')
        onClose()
        createForm.reset({
          amount: '',
          description: '',
          transactionDate: new Date().toISOString().split('T')[0],
          transactionType: 'expense',
          paymentMethodId: '',
        })

        // 거래 목록 새로고침
        await loadTransactions(orgId)
      } catch (error) {
        if (error instanceof Error && error.message === 'FORBIDDEN') {
          toast.error('이 조직에서 거래를 추가할 권한이 없습니다.')
          return
        }
        throw error // re-throw for Error Boundary
      }
    } catch (error) {
      console.error('거래 생성 실패:', error)

      const userMessage =
        error instanceof Error ? error.message : '거래 추가에 실패했습니다.'
      toast.error(userMessage)
    } finally {
      setCreating(false)
    }
  }

  const editTransaction = (transaction: TransactionForFrontend) => {
    setSelectedTransaction(transaction)
    const editData = {
      amount: Math.abs(Number(transaction.amount)).toString(),
      description: transaction.description || '',
      transactionDate: transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().split('T')[0]
        : '',
      transactionType: transaction.transactionType || 'expense',
      paymentMethodId: transaction.paymentMethodId || '',
    }
    editForm.reset(editData)
    onEditOpen()
  }

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) {
      toast.error('수정할 거래를 선택해주세요.')
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('거래 수정 시도 - editFormData:', editForm.data)
    }

    // Form validation 수행
    const { isValid, errors } = editForm.validateAll()
    if (!isValid) {
      const errorMessages = Object.values(errors).join(' ')
      toast.error(errorMessages)
      return
    }

    // Zod schema를 사용한 최종 데이터 검증
    const formDataWithIds = {
      ...editForm.data,
      id: selectedTransaction.id,
      organizationId: orgId
    }
    
    const validationResult = transactionUpdateFormSchema.safeParse(formDataWithIds)
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message).join(' ')
      toast.error(errorMessages || '필수 정보를 모두 입력해주세요')
      return
    }

    setUpdating(true)
    try {
      // 검증된 데이터 사용 (Zod transform 적용됨)
      const requestData: TransactionUpdateInput = {
        id: validationResult.data.id!,
        organizationId: validationResult.data.organizationId!,
        amount: validationResult.data.amount!,
        description: validationResult.data.description!,
        transactionDate: validationResult.data.transactionDate!,
        transactionType: validationResult.data.transactionType!,
        paymentMethodId: validationResult.data.paymentMethodId,
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Server action 수정 요청 데이터:', requestData)
      }

      try {
        const data = handleServerActionResult(
          await updateTransaction(requestData)
        )

        toast.success('거래가 성공적으로 수정되었습니다!')
        onEditClose()
        setSelectedTransaction(null)

        // 거래 목록 새로고침
        await loadTransactions(orgId)
      } catch (error) {
        if (error instanceof Error && error.message === 'FORBIDDEN') {
          toast.error('이 조직에서 거래를 수정할 권한이 없습니다.')
          return
        }
        throw error // re-throw for Error Boundary
      }
    } catch (error) {
      console.error('거래 수정 실패:', error)

      const userMessage =
        error instanceof Error ? error.message : '거래 수정에 실패했습니다.'
      toast.error(userMessage)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return

    setDeleting(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('거래 삭제 시도 - transaction:', selectedTransaction.id)
      }

      try {
        const data = handleServerActionResult(
          await deleteTransaction(selectedTransaction.id, orgId)
        )

        toast.success('거래가 성공적으로 삭제되었습니다!')
        onDeleteClose()
        setSelectedTransaction(null)

        // 거래 목록 새로고침
        await loadTransactions(orgId)
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'FORBIDDEN' || error.message === 'NOT_FOUND')
        ) {
          if (error.message === 'FORBIDDEN') {
            toast.error('이 거래를 삭제할 권한이 없습니다.')
          } else {
            toast.error('삭제하려는 거래를 찾을 수 없습니다.')
          }
          return
        }
        throw error // re-throw for Error Boundary
      }
    } catch (error) {
      console.error('거래 삭제 실패:', error)

      const userMessage =
        error instanceof Error ? error.message : '거래 삭제에 실패했습니다.'
      toast.error(userMessage)
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'expense':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4 text-blue-500" />
      default:
        return <Calendar className="w-4 h-4 text-gray-500" />
    }
  }

  const retryLoadData = () => {
    if (orgId) {
      loadTransactions(orgId)
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600'
      case 'expense':
        return 'text-red-600'
      case 'transfer':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPaymentMethodIcon = (type?: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-green-600" />
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'account':
        return <Building2 className="w-4 h-4 text-purple-600" />
      case 'other':
        return <Wallet className="w-4 h-4 text-gray-600" />
      default:
        return null
    }
  }

  const getPaymentMethodTypeName = (type?: string) => {
    switch (type) {
      case 'cash':
        return '현금'
      case 'card':
        return '카드'
      case 'account':
        return '계좌'
      case 'other':
        return '기타'
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>거래 내역을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            데이터 로드 오류
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button color="primary" onPress={retryLoadData}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">거래 관리</h1>
          <p className="text-gray-600">수입, 지출, 이체 내역을 관리하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
        >
          거래 추가
        </Button>
      </div>

      {/* 거래 목록 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <h3 className="text-lg font-semibold">거래 내역</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="bordered"
                startContent={<Filter className="w-4 h-4" />}
              >
                필터
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                거래 내역이 없습니다
              </h3>
              <p className="text-gray-500 mb-4">첫 번째 거래를 추가해보세요!</p>
              <Button color="primary" onPress={onOpen}>
                거래 추가하기
              </Button>
            </div>
          ) : (
            <Table aria-label="거래 내역 테이블">
              <TableHeader>
                <TableColumn>구분</TableColumn>
                <TableColumn>설명</TableColumn>
                <TableColumn>결제수단</TableColumn>
                <TableColumn>금액</TableColumn>
                <TableColumn>날짜</TableColumn>
                <TableColumn>작업</TableColumn>
              </TableHeader>
              <TableBody>
                {transactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionTypeIcon(
                          transaction.transactionType || 'expense'
                        )}
                        <Chip
                          size="sm"
                          variant="flat"
                          color={
                            transaction.transactionType === 'income'
                              ? 'success'
                              : transaction.transactionType === 'expense'
                                ? 'danger'
                                : 'primary'
                          }
                        >
                          {transaction.transactionType === 'income'
                            ? '수입'
                            : transaction.transactionType === 'expense'
                              ? '지출'
                              : '이체'}
                        </Chip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{transaction.description}</span>
                    </TableCell>
                    <TableCell>
                      {transaction.paymentMethod ? (
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(transaction.paymentMethod.type)}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {transaction.paymentMethod.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getPaymentMethodTypeName(transaction.paymentMethod.type)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold ${getTransactionTypeColor(
                          transaction.transactionType || 'expense'
                        )}`}
                      >
                        {transaction.transactionType === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(Number(transaction.amount)))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {transaction.transactionDate
                          ? new Date(
                              transaction.transactionDate
                            ).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button isIconOnly size="sm" variant="light">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="거래 작업">
                          <DropdownItem
                            key="edit"
                            startContent={<Edit className="w-4 h-4" />}
                            onPress={() => editTransaction(transaction)}
                          >
                            수정
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<Trash2 className="w-4 h-4" />}
                            onPress={() => {
                              setSelectedTransaction(transaction)
                              onDeleteOpen()
                            }}
                          >
                            삭제
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 거래 추가 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader>새 거래 추가</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <ValidatedSelect
                label="거래 유형"
                placeholder="거래 유형을 선택하세요"
                description="수입은 돈이 들어오는 거래, 지출은 돈이 나가는 거래입니다"
                options={[
                  { key: 'income', label: '수입' },
                  { key: 'expense', label: '지출' },
                  { key: 'transfer', label: '이체' }
                ]}
                selectedKeys={createForm.data.transactionType ? [createForm.data.transactionType] : []}
                onSelectionChange={keys => {
                  const value = Array.from(keys)[0] as string
                  createForm.updateField('transactionType', value)
                }}
                validation={createZodValidationRules.transactionType}
                isRequired
              />

              <ValidatedInput
                label="금액"
                placeholder="예: 50000"
                type="number"
                value={createForm.data.amount}
                onValueChange={value => createForm.updateField('amount', value)}
                validation={createZodValidationRules.amount}
                isRequired
                description="거래 금액을 숫자로 입력하세요"
                startContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">₩</span>
                  </div>
                }
              />

              <ValidatedInput
                label="설명"
                placeholder="예: 점심식사, 교통비, 월급 등"
                value={createForm.data.description}
                onValueChange={value => createForm.updateField('description', value)}
                validation={createZodValidationRules.description}
                isRequired
                description="거래 내용을 간단히 설명해주세요"
              />

              <ValidatedInput
                label="거래 날짜"
                type="date"
                value={createForm.data.transactionDate}
                onValueChange={value => createForm.updateField('transactionDate', value)}
                validation={createZodValidationRules.transactionDate}
                isRequired
                description="거래가 발생한 날짜를 선택하세요"
              />

              <div className="space-y-1">
                <PaymentMethodSelect
                  organizationId={orgId}
                  value={createForm.data.paymentMethodId}
                  onSelectionChange={paymentMethodId => {
                    const value = paymentMethodId || ''
                    createForm.updateField('paymentMethodId', value)
                    // 선택 시 에러 클리어 (paymentMethodId는 선택사항이므로)
                    if (createZodValidationRules.paymentMethodId && !createZodValidationRules.paymentMethodId(value)) {
                      createForm.clearFieldError('paymentMethodId')
                    }
                  }}
                  label="결제수단"
                  placeholder="결제수단을 선택하세요 (선택사항)"
                  includeNoneOption={true}
                  noneOptionLabel="결제수단 없음"
                  isInvalid={createForm.hasFieldError('paymentMethodId')}
                  errorMessage={createForm.errors.paymentMethodId}
                />
                {createForm.hasFieldError('paymentMethodId') && (
                  <p className="text-xs text-danger">
                    {createForm.errors.paymentMethodId}
                  </p>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose} disabled={creating}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleCreateTransaction}
              isLoading={creating}
              isDisabled={creating || !createForm.isValid || !createForm.data.amount || !createForm.data.description}
            >
              추가하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 거래 수정 모달 */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="md">
        <ModalContent>
          <ModalHeader>거래 수정</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <ValidatedSelect
                label="거래 유형"
                placeholder="거래 유형을 선택하세요"
                description="수입은 돈이 들어오는 거래, 지출은 돈이 나가는 거래입니다"
                options={[
                  { key: 'income', label: '수입' },
                  { key: 'expense', label: '지출' },
                  { key: 'transfer', label: '이체' }
                ]}
                selectedKeys={editForm.data.transactionType ? [editForm.data.transactionType] : []}
                onSelectionChange={keys => {
                  const value = Array.from(keys)[0] as string
                  editForm.updateField('transactionType', value)
                }}
                validation={editZodValidationRules.transactionType}
                isRequired
              />

              <ValidatedInput
                label="금액"
                placeholder="예: 50000"
                type="number"
                value={editForm.data.amount}
                onValueChange={value => editForm.updateField('amount', value)}
                validation={editZodValidationRules.amount}
                isRequired
                description="거래 금액을 숫자로 입력하세요"
                startContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">₩</span>
                  </div>
                }
              />

              <ValidatedInput
                label="설명"
                placeholder="예: 점심식사, 교통비, 월급 등"
                value={editForm.data.description}
                onValueChange={value => editForm.updateField('description', value)}
                validation={editZodValidationRules.description}
                isRequired
                description="거래 내용을 간단히 설명해주세요"
              />

              <ValidatedInput
                label="거래 날짜"
                type="date"
                value={editForm.data.transactionDate}
                onValueChange={value => editForm.updateField('transactionDate', value)}
                validation={editZodValidationRules.transactionDate}
                isRequired
                description="거래가 발생한 날짜를 선택하세요"
              />

              <div className="space-y-1">
                <PaymentMethodSelect
                  organizationId={orgId}
                  value={editForm.data.paymentMethodId}
                  onSelectionChange={paymentMethodId => {
                    const value = paymentMethodId || ''
                    editForm.updateField('paymentMethodId', value)
                    // 선택 시 에러 클리어 (paymentMethodId는 선택사항이므로)
                    if (editZodValidationRules.paymentMethodId && !editZodValidationRules.paymentMethodId(value)) {
                      editForm.clearFieldError('paymentMethodId')
                    }
                  }}
                  label="결제수단"
                  placeholder="결제수단을 선택하세요 (선택사항)"
                  includeNoneOption={true}
                  noneOptionLabel="결제수단 없음"
                  isInvalid={editForm.hasFieldError('paymentMethodId')}
                  errorMessage={editForm.errors.paymentMethodId}
                />
                {editForm.hasFieldError('paymentMethodId') && (
                  <p className="text-xs text-danger">
                    {editForm.errors.paymentMethodId}
                  </p>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditClose} disabled={updating}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleUpdateTransaction}
              isLoading={updating}
              isDisabled={updating || !editForm.isValid || !editForm.data.amount || !editForm.data.description}
            >
              수정하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 거래 삭제 확인 모달 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="sm">
        <ModalContent>
          <ModalHeader>거래 삭제</ModalHeader>
          <ModalBody>
            <p>정말로 이 거래를 삭제하시겠습니까?</p>
            <p className="text-sm text-gray-600">
              삭제된 거래는 복구할 수 없습니다.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose} disabled={deleting}>
              취소
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteTransaction}
              isLoading={deleting}
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
  )
}
