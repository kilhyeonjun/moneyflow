'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import toast, { Toaster } from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { checkAndCreateInitialData } from '@/lib/initial-data'
import TransactionForm from '@/components/transactions/TransactionForm'
import TransactionList from '@/components/transactions/TransactionList'
import DeleteConfirmModal from '@/components/transactions/DeleteConfirmModal'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: { name: string; transaction_type: string }
  payment_methods?: { name: string }
}
type Category = Database['public']['Tables']['categories']['Row']
type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']

export default function TransactionsPage() {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

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
      
      // 기본 데이터 확인 및 생성
      try {
        await checkAndCreateInitialData(storedOrgId)
        console.log('기본 데이터 확인/생성 완료')
      } catch (error) {
        console.error('기본 데이터 확인/생성 실패:', error)
      }

      await Promise.all([
        loadTransactions(storedOrgId),
        loadCategories(storedOrgId),
        loadPaymentMethods(storedOrgId)
      ])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      toast.error('데이터 로드에 실패했습니다.')
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
      toast.error('거래 내역 로드에 실패했습니다.')
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
      toast.error('카테고리 로드에 실패했습니다.')
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
      toast.error('결제수단 로드에 실패했습니다.')
    } else {
      setPaymentMethods(data || [])
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    onEditOpen()
  }

  const handleDeleteTransaction = (transaction: Transaction) => {
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

  const handleTransactionSuccess = async () => {
    if (selectedOrgId) {
      await loadTransactions(selectedOrgId)
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

      {/* 거래 목록 */}
      <TransactionList
        transactions={transactions}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        loading={loading}
      />

      {/* 거래 추가 모달 - 테스트용 */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>새 거래 추가 (테스트)</ModalHeader>
          <ModalBody>
            <p>모달이 정상적으로 작동합니다!</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              취소
            </Button>
            <Button color="primary" onPress={onClose}>
              확인
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 거래 수정 모달 */}
      {selectedTransaction && (
        <TransactionForm
          isOpen={isEditOpen}
          onClose={() => {
            setSelectedTransaction(null)
            onEditClose()
          }}
          categories={categories}
          paymentMethods={paymentMethods}
          organizationId={selectedOrgId || ''}
          onSuccess={handleTransactionSuccess}
          editTransaction={selectedTransaction}
          mode="edit"
        />
      )}

      {/* 거래 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setSelectedTransaction(null)
          onDeleteClose()
        }}
        transaction={selectedTransaction}
        onConfirm={confirmDeleteTransaction}
        loading={deleting}
      />
      
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
