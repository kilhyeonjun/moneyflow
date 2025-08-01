'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from '@heroui/react'
import {
  Wallet,
  Banknote,
  CreditCard,
  Building2,
} from 'lucide-react'
import { showToast } from '@/lib/utils/toast'
import type { PaymentMethodData } from './PaymentMethodCard'

interface PaymentMethodFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentMethodFormData) => Promise<void>
  initialData?: PaymentMethodData | null
  organizationId: string
}

export type PaymentMethodFormData = {
  id?: string
  organizationId: string
  name: string
  type: 'cash' | 'card' | 'account' | 'other'
  bankName?: string
  accountNumber?: string
  cardCompany?: string
  lastFourDigits?: string
}

const paymentMethodTypes = [
  { key: 'cash', label: '현금', icon: <Banknote className="w-4 h-4" /> },
  { key: 'card', label: '카드', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'account', label: '계좌', icon: <Building2 className="w-4 h-4" /> },
  { key: 'other', label: '기타', icon: <Wallet className="w-4 h-4" /> },
]

export default function PaymentMethodForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  organizationId,
}: PaymentMethodFormProps) {
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    organizationId,
    name: '',
    type: 'cash',
    bankName: '',
    accountNumber: '',
    cardCompany: '',
    lastFourDigits: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!initialData

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        organizationId: initialData.organizationId,
        name: initialData.name,
        type: initialData.type,
        bankName: initialData.bankName || '',
        accountNumber: initialData.accountNumber || '',
        cardCompany: initialData.cardCompany || '',
        lastFourDigits: initialData.lastFourDigits || '',
      })
    } else {
      setFormData({
        organizationId,
        name: '',
        type: 'cash',
        bankName: '',
        accountNumber: '',
        cardCompany: '',
        lastFourDigits: '',
      })
    }
    setErrors({})
  }, [initialData, organizationId, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '결제수단 이름을 입력해주세요'
    }

    if (formData.type === 'card') {
      if (formData.lastFourDigits && !/^\d{4}$/.test(formData.lastFourDigits)) {
        newErrors.lastFourDigits = '뒷 4자리는 숫자 4개를 입력해주세요'
      }
    }

    if (formData.type === 'account') {
      if (formData.accountNumber && formData.accountNumber.length < 4) {
        newErrors.accountNumber = '계좌번호는 최소 4자리 이상 입력해주세요'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsLoading(true)

      // 타입별로 불필요한 필드 제거
      const submitData = { ...formData }
      
      if (formData.type !== 'card') {
        delete submitData.cardCompany
        delete submitData.lastFourDigits
      }
      
      if (formData.type !== 'account') {
        delete submitData.bankName
        delete submitData.accountNumber
      }

      await onSubmit(submitData)
      
      showToast.success(
        isEditing ? '결제수단이 수정되었습니다' : '결제수단이 추가되었습니다'
      )
      
      onClose()
    } catch (error) {
      console.error('결제수단 저장 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '저장에 실패했습니다'
      showToast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'card':
        return (
          <>
            <Input
              label="카드사"
              placeholder="예: 신한카드, KB국민카드"
              value={formData.cardCompany}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, cardCompany: value }))
              }
            />
            
            <Input
              label="뒷 4자리"
              placeholder="1234"
              maxLength={4}
              value={formData.lastFourDigits}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, lastFourDigits: value }))
              }
              errorMessage={errors.lastFourDigits}
              isInvalid={!!errors.lastFourDigits}
            />
          </>
        )
      
      case 'account':
        return (
          <>
            <Input
              label="은행명"
              placeholder="예: 신한은행, KB국민은행"
              value={formData.bankName}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, bankName: value }))
              }
            />
            
            <Input
              label="계좌번호"
              placeholder="계좌번호를 입력하세요"
              value={formData.accountNumber}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, accountNumber: value }))
              }
              errorMessage={errors.accountNumber}
              isInvalid={!!errors.accountNumber}
            />
          </>
        )
      
      default:
        return null
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="md"
      isDismissable={!isLoading}
      hideCloseButton={isLoading}
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-blue-600" />
              <span>{isEditing ? '결제수단 수정' : '결제수단 추가'}</span>
            </div>
          </ModalHeader>
          
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="결제수단 이름"
                placeholder="예: 주거래 통장, 법인카드"
                value={formData.name}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, name: value }))
                }
                errorMessage={errors.name}
                isInvalid={!!errors.name}
                isRequired
              />

              <Select
                label="결제수단 유형"
                selectedKeys={[formData.type]}
                onSelectionChange={(keys) => {
                  const selectedType = Array.from(keys)[0] as typeof formData.type
                  setFormData(prev => ({ 
                    ...prev, 
                    type: selectedType,
                    // 타입 변경 시 관련 필드 초기화
                    bankName: '',
                    accountNumber: '',
                    cardCompany: '',
                    lastFourDigits: '',
                  }))
                }}
                renderValue={(items) => {
                  return items.map((item) => {
                    const type = paymentMethodTypes.find(t => t.key === item.key)
                    return (
                      <div key={item.key} className="flex items-center gap-2">
                        {type?.icon}
                        <span>{type?.label}</span>
                      </div>
                    )
                  })
                }}
              >
                {paymentMethodTypes.map((type) => (
                  <SelectItem 
                    key={type.key} 
                    startContent={type.icon}
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </Select>

              {renderTypeSpecificFields()}

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  {formData.type === 'card' && '카드사와 뒷 4자리는 선택사항입니다.'}
                  {formData.type === 'account' && '은행명과 계좌번호는 선택사항입니다.'}
                  {formData.type === 'cash' && '현금 결제수단입니다.'}
                  {formData.type === 'other' && '기타 결제수단입니다.'}
                </p>
              </div>
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={handleClose}
              isDisabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              startContent={!isLoading && <Wallet className="w-4 h-4" />}
            >
              {isEditing ? '수정' : '추가'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}