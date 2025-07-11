'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import toast, { Toaster } from 'react-hot-toast'
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, Search, Edit, Trash2, MoreVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type Category = Database['public']['Tables']['categories']['Row']
type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

export default function TransactionsPage() {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // 거래 입력 폼 상태
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: '',
    payment_method_id: '',
  })

  useEffect(() => {
    checkOrganizationAndLoadData()
  }, [])

  useEffect(() => {
    if (!selectedOrgId) return

    // Realtime 구독 설정
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `organization_id=eq.${selectedOrgId}`,
        },
        (payload) => {
          console.log('거래 변경 감지:', payload)
          // 거래 목록 새로고침
          loadTransactions(selectedOrgId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedOrgId])

  const checkOrganizationAndLoadData = async () => {
    try {
      const storedOrgId = localStorage.getItem('selectedOrganization')
      
      if (!storedOrgId) {
        router.push('/organizations')
        return
      }

      setSelectedOrgId(storedOrgId)
      await Promise.all([
        loadTransactions(storedOrgId),
        loadCategories(storedOrgId),
        loadPaymentMethods(storedOrgId)
      ])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async (orgId: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories (name, type),
        payment_methods (name)
      `)
      .eq('organization_id', orgId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('거래 내역 로드 실패:', error)
    } else {
      setTransactions(data || [])
    }
  }

  const loadCategories = async (orgId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('organization_id', orgId)
      .order('type')
      .order('name')

    if (error) {
      console.error('카테고리 로드 실패:', error)
    } else {
      setCategories(data || [])
    }
  }

  const loadPaymentMethods = async (orgId: string) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', orgId)
      .order('name')

    if (error) {
      console.error('결제수단 로드 실패:', error)
    } else {
      setPaymentMethods(data || [])
    }
  }

  const handleCreateTransaction = async () => {
    if (!selectedOrgId || !formData.amount || !formData.description || !formData.category_id || !formData.payment_method_id) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      // 선택된 카테고리의 type 가져오기
      const selectedCategory = categories.find(cat => cat.id === formData.category_id)
      if (!selectedCategory) {
        toast.error('유효하지 않은 카테고리입니다.')
        return
      }

      const transactionData: TransactionInsert = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
        category_id: formData.category_id,
        payment_method_id: formData.payment_method_id,
        organization_id: selectedOrgId,
        created_by: user.id,
      }

      const { error } = await supabase
        .from('transactions')
        .insert([transactionData])

      if (error) {
        console.error('거래 생성 실패:', error)
        toast.error('거래 생성에 실패했습니다.')
      } else {
        toast.success('거래가 성공적으로 추가되었습니다!')
        setFormData({
          amount: '',
          description: '',
          transaction_date: new Date().toISOString().split('T')[0],
          category_id: '',
          payment_method_id: '',
        })
        onClose()
        await loadTransactions(selectedOrgId)
      }
    } catch (error) {
      console.error('거래 생성 중 오류:', error)
      toast.error('거래 생성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction)
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      category_id: transaction.category_id,
      payment_method_id: transaction.payment_method_id,
    })
    onEditOpen()
  }

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction || !selectedOrgId || !formData.amount || !formData.description || !formData.category_id || !formData.payment_method_id) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setUpdating(true)

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(formData.amount),
          description: formData.description,
          transaction_date: formData.transaction_date,
          category_id: formData.category_id,
          payment_method_id: formData.payment_method_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTransaction.id)
        .eq('organization_id', selectedOrgId)

      if (error) {
        console.error('거래 수정 실패:', error)
        toast.error('거래 수정에 실패했습니다.')
      } else {
        toast.success('거래가 성공적으로 수정되었습니다!')
        setFormData({
          amount: '',
          description: '',
          transaction_date: new Date().toISOString().split('T')[0],
          category_id: '',
          payment_method_id: '',
        })
        setSelectedTransaction(null)
        onEditClose()
        await loadTransactions(selectedOrgId)
      }
    } catch (error) {
      console.error('거래 수정 중 오류:', error)
      toast.error('거래 수정 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteTransaction = (transaction: any) => {
    setSelectedTransaction(transaction)
    onDeleteOpen()
  }

  const confirmDeleteTransaction = async () => {
    if (!selectedTransaction || !selectedOrgId) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id)
        .eq('organization_id', selectedOrgId)

      if (error) {
        console.error('거래 삭제 실패:', error)
        toast.error('거래 삭제에 실패했습니다.')
      } else {
        toast.success('거래가 성공적으로 삭제되었습니다!')
        setSelectedTransaction(null)
        onDeleteClose()
        await loadTransactions(selectedOrgId)
      }
    } catch (error) {
      console.error('거래 삭제 중 오류:', error)
      toast.error('거래 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      (transaction as any).categories?.name.toLowerCase().includes(searchLower) ||
      (transaction as any).payment_methods?.name.toLowerCase().includes(searchLower)
    )
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'expense':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'savings':
        return <Wallet className="w-4 h-4 text-blue-500" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'success'
      case 'expense':
        return 'danger'
      case 'savings':
        return 'primary'
      default:
        return 'default'
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">거래 관리</h1>
          <p className="text-gray-600">수입, 지출, 저축을 기록하고 관리하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
        >
          새 거래 추가
        </Button>
      </div>

      {/* 거래 내역 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <h3 className="text-lg font-semibold">거래 내역</h3>
            <div className="flex gap-2">
              <Input
                placeholder="거래 검색..."
                startContent={<Search className="w-4 h-4" />}
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '거래 내역이 없습니다'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 거래를 추가해보세요!'}
              </p>
              {!searchTerm && (
                <Button color="primary" onPress={onOpen}>
                  거래 추가하기
                </Button>
              )}
            </div>
          ) : (
            <Table aria-label="거래 내역 테이블">
              <TableHeader>
                <TableColumn>날짜</TableColumn>
                <TableColumn>분류</TableColumn>
                <TableColumn>내용</TableColumn>
                <TableColumn>결제수단</TableColumn>
                <TableColumn>금액</TableColumn>
                <TableColumn>액션</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.transaction_date).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.categories?.type)}
                        <Chip
                          color={getTransactionColor(transaction.categories?.type)}
                          size="sm"
                          variant="flat"
                        >
                          {transaction.categories?.name}
                        </Chip>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.payment_methods?.name}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        transaction.categories?.type === 'income' 
                          ? 'text-green-600' 
                          : transaction.categories?.type === 'expense'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}>
                        {transaction.categories?.type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="거래 액션">
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="금액"
                  placeholder="0"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  startContent={<span className="text-gray-500">₩</span>}
                />
                <Input
                  label="거래 날짜"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>
              
              <Input
                label="거래 내용"
                placeholder="거래 내용을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="분류"
                  placeholder="분류를 선택하세요"
                  selectedKeys={formData.category_id ? [formData.category_id] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    setFormData({ ...formData, category_id: selectedKey })
                  }}
                >
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.type === 'income' ? '수입' : category.type === 'expense' ? '지출' : '저축'})
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="결제수단"
                  placeholder="결제수단을 선택하세요"
                  selectedKeys={formData.payment_method_id ? [formData.payment_method_id] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    setFormData({ ...formData, payment_method_id: selectedKey })
                  }}
                >
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
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
              추가하기
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="금액"
                  placeholder="0"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  startContent={<span className="text-gray-500">₩</span>}
                />
                <Input
                  label="거래 날짜"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>
              
              <Input
                label="거래 내용"
                placeholder="거래 내용을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="분류"
                  placeholder="분류를 선택하세요"
                  selectedKeys={formData.category_id ? [formData.category_id] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    setFormData({ ...formData, category_id: selectedKey })
                  }}
                >
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.type === 'income' ? '수입' : category.type === 'expense' ? '지출' : '저축'})
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="결제수단"
                  placeholder="결제수단을 선택하세요"
                  selectedKeys={formData.payment_method_id ? [formData.payment_method_id] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    setFormData({ ...formData, payment_method_id: selectedKey })
                  }}
                >
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
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
              수정하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 거래 삭제 확인 모달 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>거래 삭제</ModalHeader>
          <ModalBody>
            <p>정말로 이 거래를 삭제하시겠습니까?</p>
            {selectedTransaction && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p><strong>내용:</strong> {selectedTransaction.description}</p>
                <p><strong>금액:</strong> {formatCurrency(Math.abs(selectedTransaction.amount))}</p>
                <p><strong>날짜:</strong> {new Date(selectedTransaction.transaction_date).toLocaleDateString('ko-KR')}</p>
              </div>
            )}
            <p className="text-red-600 text-sm mt-2">이 작업은 되돌릴 수 없습니다.</p>
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