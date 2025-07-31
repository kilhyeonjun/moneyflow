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

// 카멜 케이스 타입 정의
interface Transaction {
  id: string
  organizationId: string
  userId: string
  amount: number
  description: string
  transactionDate: string
  transactionType: string
  categoryId: string | null
  paymentMethodId: string | null
  tags: string[] | null
  memo: string | null
  receiptUrl: string | null
  createdAt: string
  updatedAt: string
  category?: { name: string; transactionType: string } | null
  paymentMethod?: { name: string } | null
}

interface Category {
  id: string
  name: string
  transactionType: string
  parentId: string | null
  level: number
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
    useState<Transaction | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionCategories, setTransactionCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)

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
      setError(null)

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

      // 응답 상태 확인 및 에러 처리
      if (!transactionsResponse.ok) {
        if (transactionsResponse.status === 401) {
          router.push('/login')
          return
        }
        if (transactionsResponse.status === 403) {
          setError('이 조직에 접근할 권한이 없습니다.')
          return
        }
        throw new Error(`거래 내역 로드 실패: ${transactionsResponse.status}`)
      }

      if (!categoriesResponse.ok) {
        throw new Error(`카테고리 로드 실패: ${categoriesResponse.status}`)
      }

      const [transactionsData, categoriesData] = await Promise.all([
        transactionsResponse.json(),
        categoriesResponse.json(),
      ])

      if (process.env.NODE_ENV === 'development') {
        console.log('로드된 거래 데이터:', transactionsData)
        console.log('로드된 카테고리 데이터:', categoriesData)
      }
      
      setTransactions(transactionsData.transactions || [])
      setTransactionCategories(categoriesData || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('거래 생성 시도 - formData:', formData)
    }
    
    // 상세한 폼 검증
    const validationErrors = []
    if (!formData.categoryId || formData.categoryId.trim() === '') {
      validationErrors.push('카테고리를 선택해주세요.')
    }
    if (!formData.amount || formData.amount.trim() === '') {
      validationErrors.push('금액을 입력해주세요.')
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      validationErrors.push('올바른 금액을 입력해주세요.')
    }
    if (!formData.description || formData.description.trim() === '') {
      validationErrors.push('설명을 입력해주세요.')
    }
    
    if (validationErrors.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('폼 검증 실패:', {
          amount: formData.amount,
          description: formData.description,
          categoryId: formData.categoryId,
          errors: validationErrors
        })
      }
      toast.error(validationErrors.join(' '))
      return
    }

    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) {
        router.push('/login')
        return
      }

      const requestData = {
        organizationId: orgId,
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount),
        description: formData.description,
        transactionDate: formData.transactionDate,
        transactionType: formData.transactionType,
        userId: session.user.id, // 누락된 userId 추가
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('API 요청 데이터:', requestData)
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('응답 상태:', response.status, response.statusText)
      }

      if (!response.ok) {
        const errorText = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.log('오류 응답:', errorText)
        }
        let errorMessage = 'Failed to create transaction'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.log('JSON 파싱 실패, 원본 텍스트 사용:', errorText)
          }
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
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
      
      // 오류 메시지 파싱
      let userMessage = '거래 추가에 실패했습니다.'
      if (error instanceof Error) {
        if (error.message.includes('categoryId')) {
          userMessage = '선택한 카테고리에 문제가 있습니다. 다른 카테고리를 선택해 주세요.'
        } else if (error.message.includes('amount')) {
          userMessage = '금액 정보에 문제가 있습니다. 올바른 금액을 입력해 주세요.'
        } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          userMessage = '로그인이 필요합니다. 다시 로그인해 주세요.'
        } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
          userMessage = '이 조직에서 거래를 추가할 권한이 없습니다.'
        } else if (error.message !== 'Failed to create transaction') {
          userMessage = error.message
        }
      }
      
      toast.error(userMessage)
    } finally {
      setCreating(false)
    }
  }

  const editTransaction = (transaction: Transaction) => {
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
    if (!selectedTransaction) {
      toast.error('수정할 거래를 선택해주세요.')
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('거래 수정 시도 - editFormData:', editFormData)
    }
    
    // 상세한 폼 검증
    const validationErrors = []
    if (!editFormData.categoryId || editFormData.categoryId.trim() === '') {
      validationErrors.push('카테고리를 선택해주세요.')
    }
    if (!editFormData.amount || editFormData.amount.trim() === '') {
      validationErrors.push('금액을 입력해주세요.')
    } else if (isNaN(parseFloat(editFormData.amount)) || parseFloat(editFormData.amount) <= 0) {
      validationErrors.push('올바른 금액을 입력해주세요.')
    }
    if (!editFormData.description || editFormData.description.trim() === '') {
      validationErrors.push('설명을 입력해주세요.')
    }
    
    if (validationErrors.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('폼 검증 실패:', {
          amount: editFormData.amount,
          description: editFormData.description,
          categoryId: editFormData.categoryId,
          errors: validationErrors
        })
      }
      toast.error(validationErrors.join(' '))
      return
    }

    setUpdating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) {
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
          userId: session.user.id, // userId 추가
        }),
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('응답 상태:', response.status, response.statusText)
      }

      if (!response.ok) {
        const errorText = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.log('오류 응답:', errorText)
        }
        let errorMessage = 'Failed to update transaction'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.log('JSON 파싱 실패, 원본 텍스트 사용:', errorText)
          }
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      toast.success('거래가 성공적으로 수정되었습니다!')
      onEditClose()
      setSelectedTransaction(null)
      
      // 거래 목록 새로고침
      await loadTransactionsAndCategories(orgId)
    } catch (error) {
      console.error('거래 수정 실패:', error)
      
      // 오류 메시지 파싱
      let userMessage = '거래 수정에 실패했습니다.'
      if (error instanceof Error) {
        if (error.message.includes('categoryId')) {
          userMessage = '선택한 카테고리에 문제가 있습니다. 다른 카테고리를 선택해 주세요.'
        } else if (error.message.includes('amount')) {
          userMessage = '금액 정보에 문제가 있습니다. 올바른 금액을 입력해 주세요.'
        } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          userMessage = '로그인이 필요합니다. 다시 로그인해 주세요.'
        } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
          userMessage = '이 조직에서 거래를 수정할 권한이 없습니다.'
        } else if (error.message !== 'Failed to update transaction') {
          userMessage = error.message
        }
      }
      
      toast.error(userMessage)
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

      const response = await fetch(`/api/transactions?id=${selectedTransaction.id}&organizationId=${orgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to delete transaction'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      toast.success('거래가 성공적으로 삭제되었습니다!')
      onDeleteClose()
      setSelectedTransaction(null)
      
      // 거래 목록 새로고침
      await loadTransactionsAndCategories(orgId)
    } catch (error) {
      console.error('거래 삭제 실패:', error)
      
      // 오류 메시지 파싱
      let userMessage = '거래 삭제에 실패했습니다.'
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
          userMessage = '삭제하려는 거래를 찾을 수 없습니다.'
        } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          userMessage = '로그인이 필요합니다. 다시 로그인해 주세요.'
        } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
          userMessage = '이 거래를 삭제할 권한이 없습니다.'
        } else if (error.message !== 'Failed to delete transaction') {
          userMessage = error.message
        }
      }
      
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
      loadTransactionsAndCategories(orgId)
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            데이터 로드 오류
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            color="primary"
            onPress={retryLoadData}
          >
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