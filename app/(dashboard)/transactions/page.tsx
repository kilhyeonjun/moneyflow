'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// Prisma 타입 import
import type { transactions, categories } from '@prisma/client'

// 확장된 타입 정의
interface TransactionWithCategory extends transactions {
  categories: categories | null
}

export default function TransactionsPage() {
  const router = useRouter()
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
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithCategory | null>(null)

  const [transactions, setTransactions] = useState<TransactionWithCategory[]>(
    []
  )
  const [transactionCategories, setTransactionCategories] = useState<
    categories[]
  >([])

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionType: 'expense',
  })

  const [editFormData, setEditFormData] = useState({
    categoryId: '',
    amount: '',
    description: '',
    transactionDate: '',
    transactionType: 'expense',
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

      // 사용자 인증 상태 확인
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        toast.error('사용자 인증에 실패했습니다.')
        return
      }

      if (!user) {
        toast.error('로그인이 필요합니다.')
        router.push('/login')
        return
      }

      await Promise.all([
        loadTransactionCategories(storedOrgId),
        loadTransactions(storedOrgId),
      ])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactionCategories = async (orgId: string) => {
    try {
      const response = await fetch(
        `/api/transaction-categories?organizationId=${orgId}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const categories = await response.json()

      // 카테고리가 없으면 기본 카테고리 생성
      if (!categories || categories.length === 0) {
        await createDefaultCategories(orgId)
        // 다시 카테고리 로드
        const retryResponse = await fetch(
          `/api/transaction-categories?organizationId=${orgId}`
        )
        if (retryResponse.ok) {
          const retryCategories = await retryResponse.json()
          setTransactionCategories(retryCategories || [])
        }
      } else {
        setTransactionCategories(categories)
      }
    } catch (error) {
      console.error('거래 카테고리 로드 실패:', error)
      toast.error('거래 카테고리를 불러오는데 실패했습니다.')
    }
  }

  const createDefaultCategories = async (orgId: string) => {
    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: orgId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create default categories')
      }

      toast.success('기본 카테고리가 생성되었습니다!')
    } catch (error) {
      console.error('기본 카테고리 생성 실패:', error)
      toast.error('기본 카테고리 생성에 실패했습니다.')
    }
  }

  const loadTransactions = async (orgId: string) => {
    try {
      const response = await fetch(
        `/api/transactions?organizationId=${orgId}&limit=50`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const transactionsData = await response.json()
      setTransactions(transactionsData || [])
    } catch (error) {
      console.error('거래 내역 로드 실패:', error)
      toast.error('거래 내역을 불러오는데 실패했습니다.')
    }
  }

  const handleCreateTransaction = async () => {
    if (
      !selectedOrgId ||
      !formData.categoryId ||
      !formData.amount ||
      !formData.transactionType
    ) {
      toast.error('모든 필수 필드를 입력해주세요.')
      return
    }

    setCreating(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const transactionData = {
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        transactionDate: formData.transactionDate,
        transactionType: formData.transactionType,
        organizationId: selectedOrgId,
        userId: user.id,
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create transaction')
      }

      toast.success('거래가 성공적으로 추가되었습니다! 🎉')

      setFormData({
        categoryId: '',
        amount: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionType: 'expense',
      })
      onClose()
      await loadTransactions(selectedOrgId)
    } catch (error) {
      console.error('거래 생성 중 오류:', error)

      if (error instanceof Error) {
        toast.error(`거래 생성 실패: ${error.message}`)
      } else {
        toast.error('거래 생성 중 알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction)
    setEditFormData({
      categoryId: transaction.category_id || '',
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      transactionDate: transaction.transaction_date.toISOString().split('T')[0],
      transactionType: transaction.transaction_type,
    })
    onEditOpen()
  }

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction || !selectedOrgId) {
      toast.error('선택된 거래가 없습니다.')
      return
    }

    if (
      !editFormData.categoryId ||
      !editFormData.amount ||
      !editFormData.transactionType
    ) {
      toast.error('모든 필수 필드를 입력해주세요.')
      return
    }

    setUpdating(true)

    try {
      const transactionData = {
        id: selectedTransaction.id,
        categoryId: editFormData.categoryId,
        amount: parseFloat(editFormData.amount),
        description: editFormData.description || null,
        transactionDate: editFormData.transactionDate,
        transactionType: editFormData.transactionType,
        organizationId: selectedOrgId,
      }

      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update transaction')
      }

      toast.success('거래가 성공적으로 수정되었습니다! ✅')

      onEditClose()
      await loadTransactions(selectedOrgId)
    } catch (error) {
      console.error('거래 수정 중 오류:', error)

      if (error instanceof Error) {
        toast.error(`거래 수정 실패: ${error.message}`)
      } else {
        toast.error('거래 수정 중 알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteTransaction = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction)
    onDeleteOpen()
  }

  const confirmDeleteTransaction = async () => {
    if (!selectedTransaction || !selectedOrgId) {
      toast.error('선택된 거래가 없습니다.')
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(
        `/api/transactions?id=${selectedTransaction.id}&organizationId=${selectedOrgId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete transaction')
      }

      toast.success('거래가 성공적으로 삭제되었습니다! 🗑️')

      onDeleteClose()
      await loadTransactions(selectedOrgId)
    } catch (error) {
      console.error('거래 삭제 중 오류:', error)

      if (error instanceof Error) {
        toast.error(`거래 삭제 실패: ${error.message}`)
      } else {
        toast.error('거래 삭제 중 알 수 없는 오류가 발생했습니다.')
      }
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'expense':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'transfer':
        return <ArrowRightLeft className="w-5 h-5 text-blue-600" />
      default:
        return <ArrowRightLeft className="w-5 h-5 text-gray-600" />
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return '수입'
      case 'expense':
        return '지출'
      case 'transfer':
        return '이체'
      default:
        return type
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'success'
      case 'expense':
        return 'danger'
      case 'transfer':
        return 'primary'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>거래 내역을 불러오는 중...</p>
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
          <p className="text-gray-600">수입과 지출을 체계적으로 관리하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
          isDisabled={transactionCategories.length === 0}
        >
          거래 추가
        </Button>
      </div>

      {/* 카테고리 없음 경고 */}
      {transactionCategories.length === 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader className="flex flex-row items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-600">
              거래 카테고리가 없습니다
            </h3>
          </CardHeader>
          <CardBody>
            <p className="text-gray-700 mb-4">
              거래를 추가하려면 먼저 거래 카테고리가 필요합니다. 기본 카테고리를
              생성하거나 관리자에게 문의하세요.
            </p>
            <Button color="primary" onClick={() => window.location.reload()}>
              페이지 새로고침
            </Button>
          </CardBody>
        </Card>
      )}

      {/* 거래 내역 테이블 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">최근 거래 내역</h3>
              <p className="text-sm text-gray-600">
                총 {transactions.length}건의 거래
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="light"
            startContent={<Filter className="w-4 h-4" />}
          >
            필터
          </Button>
        </CardHeader>
        <CardBody>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">등록된 거래가 없습니다</p>
              <p className="text-sm mb-4">첫 번째 거래를 추가해보세요!</p>
              <Button color="primary" onPress={onOpen}>
                거래 추가
              </Button>
            </div>
          ) : (
            <Table aria-label="거래 내역 테이블">
              <TableHeader>
                <TableColumn>날짜</TableColumn>
                <TableColumn>카테고리</TableColumn>
                <TableColumn>설명</TableColumn>
                <TableColumn>타입</TableColumn>
                <TableColumn>금액</TableColumn>
                <TableColumn>작업</TableColumn>
              </TableHeader>
              <TableBody>
                {transactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(
                        transaction.transaction_date
                      ).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_type)}
                        <span>{transaction.categories?.name || '미분류'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {transaction.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={
                          getTransactionTypeColor(
                            transaction.transaction_type
                          ) as any
                        }
                        variant="flat"
                      >
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold ${
                          transaction.transaction_type === 'income'
                            ? 'text-green-600'
                            : transaction.transaction_type === 'expense'
                              ? 'text-red-600'
                              : 'text-blue-600'
                        }`}
                      >
                        {transaction.transaction_type === 'expense' ? '-' : '+'}
                        {formatCurrency(Number(transaction.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="거래 관리">
                          <DropdownItem
                            key="edit"
                            startContent={<Edit className="w-4 h-4" />}
                            onPress={() => handleEditTransaction(transaction)}
                          >
                            수정
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<Trash2 className="w-4 h-4" />}
                            onPress={() => handleDeleteTransaction(transaction)}
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
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>새 거래 추가</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Select
                label="거래 타입"
                placeholder="거래 타입을 선택하세요"
                selectedKeys={
                  formData.transactionType ? [formData.transactionType] : []
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, transactionType: selectedKey })
                }}
                isRequired
              >
                <SelectItem key="income">수입</SelectItem>
                <SelectItem key="expense">지출</SelectItem>
                <SelectItem key="transfer">이체</SelectItem>
              </Select>

              <Select
                label="카테고리"
                placeholder="카테고리를 선택하세요"
                selectedKeys={formData.categoryId ? [formData.categoryId] : []}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, categoryId: selectedKey })
                }}
                isRequired
              >
                {transactionCategories
                  .filter(
                    cat =>
                      !formData.transactionType ||
                      cat.transaction_type === formData.transactionType
                  )
                  .map(category => (
                    <SelectItem key={category.id}>{category.name}</SelectItem>
                  ))}
              </Select>

              <Input
                label="금액"
                placeholder="0"
                type="number"
                value={formData.amount}
                onChange={e =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                startContent={<span className="text-gray-500">₩</span>}
                isRequired
              />

              <Input
                label="거래 날짜"
                type="date"
                value={formData.transactionDate}
                onChange={e =>
                  setFormData({ ...formData, transactionDate: e.target.value })
                }
                isRequired
              />

              <Textarea
                label="설명 (선택사항)"
                placeholder="거래에 대한 추가 정보를 입력하세요"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleCreateTransaction}
              isLoading={creating}
            >
              거래 추가
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 거래 수정 모달 */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalContent>
          <ModalHeader>거래 수정</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Select
                label="거래 타입"
                placeholder="거래 타입을 선택하세요"
                selectedKeys={
                  editFormData.transactionType
                    ? [editFormData.transactionType]
                    : []
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setEditFormData({
                    ...editFormData,
                    transactionType: selectedKey,
                  })
                }}
                isRequired
              >
                <SelectItem key="income">수입</SelectItem>
                <SelectItem key="expense">지출</SelectItem>
                <SelectItem key="transfer">이체</SelectItem>
              </Select>

              <Select
                label="카테고리"
                placeholder="카테고리를 선택하세요"
                selectedKeys={
                  editFormData.categoryId ? [editFormData.categoryId] : []
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setEditFormData({ ...editFormData, categoryId: selectedKey })
                }}
                isRequired
              >
                {transactionCategories
                  .filter(
                    cat =>
                      !editFormData.transactionType ||
                      cat.transaction_type === editFormData.transactionType
                  )
                  .map(category => (
                    <SelectItem key={category.id}>{category.name}</SelectItem>
                  ))}
              </Select>

              <Input
                label="금액"
                placeholder="0"
                type="number"
                value={editFormData.amount}
                onChange={e =>
                  setEditFormData({ ...editFormData, amount: e.target.value })
                }
                startContent={<span className="text-gray-500">₩</span>}
                isRequired
              />

              <Input
                label="거래 날짜"
                type="date"
                value={editFormData.transactionDate}
                onChange={e =>
                  setEditFormData({
                    ...editFormData,
                    transactionDate: e.target.value,
                  })
                }
                isRequired
              />

              <Textarea
                label="설명 (선택사항)"
                placeholder="거래에 대한 추가 정보를 입력하세요"
                value={editFormData.description}
                onChange={e =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditClose}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleUpdateTransaction}
              isLoading={updating}
            >
              수정 완료
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 거래 삭제 확인 모달 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader className="text-danger">거래 삭제 확인</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">
                    정말로 이 거래를 삭제하시겠습니까?
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
              </div>

              {selectedTransaction && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getTransactionIcon(selectedTransaction.transaction_type)}
                    <span className="font-medium">
                      {selectedTransaction.categories?.name || '미분류'}
                    </span>
                    <Chip
                      size="sm"
                      color={
                        getTransactionTypeColor(
                          selectedTransaction.transaction_type
                        ) as any
                      }
                      variant="flat"
                    >
                      {getTransactionTypeLabel(
                        selectedTransaction.transaction_type
                      )}
                    </Chip>
                  </div>
                  <p className="text-lg font-semibold mb-1">
                    {selectedTransaction.transaction_type === 'expense'
                      ? '-'
                      : '+'}
                    {formatCurrency(Number(selectedTransaction.amount))}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(
                      selectedTransaction.transaction_date
                    ).toLocaleDateString('ko-KR')}
                  </p>
                  {selectedTransaction.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedTransaction.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              취소
            </Button>
            <Button
              color="danger"
              onPress={confirmDeleteTransaction}
              isLoading={deleting}
            >
              삭제
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Toast 알림 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}
