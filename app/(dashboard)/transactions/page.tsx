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
} from '@heroui/react'
import toast, { Toaster } from 'react-hot-toast'
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type Category = Database['public']['Tables']['categories']['Row']
type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

export default function TransactionsPage() {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  
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
        categories (name, transaction_type),
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
      .order('transaction_type')
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

      // 선택된 카테고리의 transaction_type 가져오기
      const selectedCategory = categories.find(cat => cat.id === formData.category_id)
      if (!selectedCategory) {
        toast.error('유효하지 않은 카테고리입니다.')
        return
      }

      const transactionData: TransactionInsert = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
        transaction_type: selectedCategory.transaction_type,
        category_id: formData.category_id,
        payment_method_id: formData.payment_method_id,
        organization_id: selectedOrgId,
        user_id: user.id,
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
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

  const getTransactionColor = (transactionType: string) => {
    switch (transactionType) {
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
              />
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">거래 내역이 없습니다</h3>
              <p className="text-gray-500 mb-4">첫 번째 거래를 추가해보세요!</p>
              <Button color="primary" onPress={onOpen}>
                거래 추가하기
              </Button>
            </div>
          ) : (
            <Table aria-label="거래 내역 테이블">
              <TableHeader>
                <TableColumn>날짜</TableColumn>
                <TableColumn>분류</TableColumn>
                <TableColumn>내용</TableColumn>
                <TableColumn>결제수단</TableColumn>
                <TableColumn>금액</TableColumn>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.transaction_date).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.categories?.transaction_type)}
                        <Chip
                          color={getTransactionColor(transaction.categories?.transaction_type)}
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
                        transaction.categories?.transaction_type === 'income' 
                          ? 'text-green-600' 
                          : transaction.categories?.transaction_type === 'expense'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}>
                        {transaction.categories?.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
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
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.transaction_type === 'income' ? '수입' : category.transaction_type === 'expense' ? '지출' : '저축'})
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="결제수단"
                  placeholder="결제수단을 선택하세요"
                  value={formData.payment_method_id}
                  onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
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