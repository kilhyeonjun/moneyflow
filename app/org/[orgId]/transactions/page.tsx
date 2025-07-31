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
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import HierarchicalCategorySelect from '@/components/ui/HierarchicalCategorySelect'

// Prisma 타입 import
import type { Transaction, Category } from '@prisma/client'

// 확장된 타입 정의
interface TransactionWithCategory extends Transaction {
  category: Category | null
}

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
    useState<TransactionWithCategory | null>(null)

  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [transactionCategories, setTransactionCategories] = useState<Category[]>([])

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
    if (orgId) {
      loadTransactionsAndCategories(orgId)
    }
  }, [orgId])

  const loadTransactionsAndCategories = async (organizationId: string) => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // 거래 내역과 카테고리를 병렬로 로드
      const [transactionsResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/transactions?organizationId=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }),
        fetch(`/api/transaction-categories?organizationId=${organizationId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }),
      ])

      if (!transactionsResponse.ok || !categoriesResponse.ok) {
        throw new Error('Failed to load data')
      }

      const [transactionsData, categoriesData] = await Promise.all([
        transactionsResponse.json(),
        categoriesResponse.json(),
      ])

      console.log('로드된 카테고리 데이터:', categoriesData)
      setTransactions(transactionsData.transactions || [])
      setTransactionCategories(categoriesData || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async () => {
    if (!formData.amount || !formData.description || !formData.categoryId) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          organizationId: orgId,
          categoryId: formData.categoryId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          transactionDate: formData.transactionDate,
          transactionType: formData.transactionType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      toast.success('거래가 성공적으로 추가되었습니다!')
      onClose()
      setFormData({
        categoryId: '',
        amount: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionType: 'expense',
      })
      
      // 거래 목록 새로고침
      await loadTransactionsAndCategories(orgId)
    } catch (error) {
      console.error('거래 생성 실패:', error)
      toast.error('거래 추가에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const editTransaction = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction)
    setEditFormData({
      categoryId: transaction.categoryId || '',
      amount: Math.abs(Number(transaction.amount)).toString(),
      description: transaction.description || '',
      transactionDate: transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().split('T')[0]
        : '',
      transactionType: transaction.transactionType || 'expense',
    })
    onEditOpen()
  }

  const updateTransaction = async () => {
    if (!selectedTransaction || !editFormData.amount || !editFormData.description || !editFormData.categoryId) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setUpdating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: selectedTransaction.id,
          organizationId: orgId,
          categoryId: editFormData.categoryId,
          amount: parseFloat(editFormData.amount),
          description: editFormData.description,
          transactionDate: editFormData.transactionDate,
          transactionType: editFormData.transactionType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update transaction')
      }

      toast.success('거래가 성공적으로 수정되었습니다!')
      onEditClose()
      setSelectedTransaction(null)
      
      // 거래 목록 새로고침
      await loadTransactionsAndCategories(orgId)
    } catch (error) {
      console.error('거래 수정 실패:', error)
      toast.error('거래 수정에 실패했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const deleteTransaction = async () => {
    if (!selectedTransaction) return

    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: selectedTransaction.id,
          organizationId: orgId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete transaction')
      }

      toast.success('거래가 성공적으로 삭제되었습니다!')
      onDeleteClose()
      setSelectedTransaction(null)
      
      // 거래 목록 새로고침
      await loadTransactionsAndCategories(orgId)
    } catch (error) {
      console.error('거래 삭제 실패:', error)
      toast.error('거래 삭제에 실패했습니다.')
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
              <Button size="sm" variant="bordered" startContent={<Filter className="w-4 h-4" />}>
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
                <TableColumn>카테고리</TableColumn>
                <TableColumn>설명</TableColumn>
                <TableColumn>금액</TableColumn>
                <TableColumn>날짜</TableColumn>
                <TableColumn>작업</TableColumn>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionTypeIcon(transaction.transactionType || 'expense')}
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
                      <span className="font-medium">
                        {transaction.category?.name || '기타'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span>{transaction.description}</span>
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
                          ? new Date(transaction.transactionDate).toLocaleDateString('ko-KR')
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
              <Select
                label="거래 유형"
                placeholder="거래 유형을 선택하세요"
                selectedKeys={[formData.transactionType]}
                onSelectionChange={(keys) =>
                  setFormData(prev => ({
                    ...prev,
                    transactionType: Array.from(keys)[0] as string
                  }))
                }
              >
                <SelectItem key="income">
                  수입
                </SelectItem>
                <SelectItem key="expense">
                  지출
                </SelectItem>
                <SelectItem key="transfer">
                  이체
                </SelectItem>
              </Select>

              <HierarchicalCategorySelect
                categories={transactionCategories}
                selectedCategoryId={formData.categoryId}
                onSelectionChange={(categoryId) =>
                  setFormData(prev => ({
                    ...prev,
                    categoryId
                  }))
                }
                transactionType={formData.transactionType}
                label="카테고리"
                placeholder="카테고리를 선택하세요"
                isRequired={true}
              />

              <Input
                label="금액"
                placeholder="금액을 입력하세요"
                type="number"
                value={formData.amount}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, amount: value }))
                }
                startContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">₩</span>
                  </div>
                }
              />

              <Input
                label="설명"
                placeholder="거래 설명을 입력하세요"
                value={formData.description}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, description: value }))
                }
              />

              <Input
                label="거래 날짜"
                type="date"
                value={formData.transactionDate}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, transactionDate: value }))
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose} disabled={creating}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={createTransaction}
              isLoading={creating}
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
              <Select
                label="거래 유형"
                placeholder="거래 유형을 선택하세요"
                selectedKeys={[editFormData.transactionType]}
                onSelectionChange={(keys) =>
                  setEditFormData(prev => ({
                    ...prev,
                    transactionType: Array.from(keys)[0] as string
                  }))
                }
              >
                <SelectItem key="income">
                  수입
                </SelectItem>
                <SelectItem key="expense">
                  지출
                </SelectItem>
                <SelectItem key="transfer">
                  이체
                </SelectItem>
              </Select>

              <HierarchicalCategorySelect
                categories={transactionCategories}
                selectedCategoryId={editFormData.categoryId}
                onSelectionChange={(categoryId) =>
                  setEditFormData(prev => ({
                    ...prev,
                    categoryId
                  }))
                }
                transactionType={editFormData.transactionType}
                label="카테고리"
                placeholder="카테고리를 선택하세요"
                isRequired={true}
              />

              <Input
                label="금액"
                placeholder="금액을 입력하세요"
                type="number"
                value={editFormData.amount}
                onValueChange={(value) =>
                  setEditFormData(prev => ({ ...prev, amount: value }))
                }
                startContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">₩</span>
                  </div>
                }
              />

              <Input
                label="설명"
                placeholder="거래 설명을 입력하세요"
                value={editFormData.description}
                onValueChange={(value) =>
                  setEditFormData(prev => ({ ...prev, description: value }))
                }
              />

              <Input
                label="거래 날짜"
                type="date"
                value={editFormData.transactionDate}
                onValueChange={(value) =>
                  setEditFormData(prev => ({ ...prev, transactionDate: value }))
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditClose} disabled={updating}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={updateTransaction}
              isLoading={updating}
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
              onPress={deleteTransaction}
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