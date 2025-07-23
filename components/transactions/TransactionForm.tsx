'use client'

import { useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']
type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  paymentMethods: PaymentMethod[]
  organizationId: string
  onSuccess: () => void
  editTransaction?: Transaction
  mode?: 'create' | 'edit'
}

export default function TransactionForm({
  isOpen,
  onClose,
  categories,
  paymentMethods,
  organizationId,
  onSuccess,
  editTransaction,
  mode = 'create',
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: editTransaction?.amount?.toString() || '',
    description: editTransaction?.description || '',
    transaction_date:
      editTransaction?.transaction_date ||
      new Date().toISOString().split('T')[0],
    category_id: editTransaction?.category_id || '',
    payment_method_id: editTransaction?.payment_method_id || '',
  })

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      category_id: '',
      payment_method_id: '',
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (
      !formData.amount ||
      !formData.description ||
      !formData.category_id ||
      !formData.payment_method_id
    ) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      // 선택된 카테고리의 type 가져오기
      const selectedCategory = categories.find(
        cat => cat.id === formData.category_id
      )
      if (!selectedCategory) {
        toast.error('유효하지 않은 카테고리입니다.')
        return
      }

      if (mode === 'create') {
        // 새 거래 생성
        const transactionData: TransactionInsert = {
          amount: parseFloat(formData.amount),
          description: formData.description,
          transaction_date: formData.transaction_date,
          category_id: formData.category_id,
          payment_method_id: formData.payment_method_id,
          organization_id: organizationId,
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
          resetForm()
          onSuccess()
          onClose()
        }
      } else if (editTransaction) {
        // 거래 수정
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
          .eq('id', editTransaction.id)
          .eq('organization_id', organizationId)

        if (error) {
          console.error('거래 수정 실패:', error)
          toast.error('거래 수정에 실패했습니다.')
        } else {
          toast.success('거래가 성공적으로 수정되었습니다!')
          resetForm()
          onSuccess()
          onClose()
        }
      } else {
        toast.error('편집할 거래 정보가 없습니다.')
      }
    } catch (error) {
      console.error('거래 처리 중 오류:', error)
      toast.error('거래 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return '수입'
      case 'expense':
        return '지출'
      case 'savings':
        return '저축'
      default:
        return '기타'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <ModalContent>
        <ModalHeader>
          {mode === 'create' ? '새 거래 추가' : '거래 수정'}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                value={formData.transaction_date}
                onChange={e =>
                  setFormData({ ...formData, transaction_date: e.target.value })
                }
                isRequired
              />
            </div>

            <Input
              label="거래 내용"
              placeholder="거래 내용을 입력하세요"
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              isRequired
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="분류"
                placeholder="분류를 선택하세요"
                selectedKeys={
                  formData.category_id ? [formData.category_id] : []
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, category_id: selectedKey })
                }}
                isRequired
              >
                {categories.map(category => (
                  <SelectItem key={category.id}>
                    {category.name} ({getTransactionTypeLabel(category.type)})
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="결제수단"
                placeholder="결제수단을 선택하세요"
                selectedKeys={
                  formData.payment_method_id ? [formData.payment_method_id] : []
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, payment_method_id: selectedKey })
                }}
                isRequired
              >
                {paymentMethods.map(method => (
                  <SelectItem key={method.id}>{method.name}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            취소
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={loading}>
            {mode === 'create' ? '추가하기' : '수정하기'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
