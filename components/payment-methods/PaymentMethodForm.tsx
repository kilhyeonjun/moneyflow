'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react'
import { Wallet, Banknote, CreditCard, Building2 } from 'lucide-react'
import { showToast } from '@/lib/utils/toast'
import {
  useFormValidation,
  commonValidationRules,
} from '@/hooks/useFormValidation'
import ValidatedInput from '@/components/form/ValidatedInput'
import ValidatedSelect, {
  type SelectOption,
} from '@/components/form/ValidatedSelect'
import {
  paymentMethodFormSchema,
  type PaymentMethodFormInput,
} from '@/lib/validation/schemas'
import type { PaymentMethodData } from './PaymentMethodCard'

interface PaymentMethodFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentMethodFormData) => Promise<void>
  initialData?: PaymentMethodData | null
  organizationId: string
}

export type PaymentMethodFormData = PaymentMethodFormInput & {
  id?: string
}

const paymentMethodTypes: SelectOption[] = [
  {
    key: 'cash',
    label: '현금',
    startContent: <Banknote className="w-4 h-4" />,
    description: '현금 결제수단',
  },
  {
    key: 'card',
    label: '카드',
    startContent: <CreditCard className="w-4 h-4" />,
    description: '신용카드, 체크카드 등',
  },
  {
    key: 'account',
    label: '계좌',
    startContent: <Building2 className="w-4 h-4" />,
    description: '은행 계좌, 입출금통장 등',
  },
  {
    key: 'other',
    label: '기타',
    startContent: <Wallet className="w-4 h-4" />,
    description: '기타 결제수단',
  },
]

export default function PaymentMethodForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  organizationId,
}: PaymentMethodFormProps) {
  const isEditing = !!initialData
  const [isLoading, setIsLoading] = useState(false)

  // Form validation 설정
  const validationRules = {
    name: commonValidationRules.combine(
      commonValidationRules.required('결제수단 이름'),
      commonValidationRules.stringLength(2, 50, '결제수단 이름')
    ),
    type: commonValidationRules.required('결제수단 유형'),
    cardCompany: (value: string) => {
      if (value && value.length > 100) {
        return '카드사명은 100자 이하여야 합니다'
      }
      return null
    },
    lastFourDigits: (value: string) => {
      if (value && !/^\d{4}$/.test(value)) {
        return '카드 뒷 4자리는 숫자 4개여야 합니다'
      }
      return null
    },
    bankName: (value: string) => {
      if (value && value.length > 100) {
        return '은행명은 100자 이하여야 합니다'
      }
      return null
    },
    accountNumber: (value: string) => {
      if (value) {
        if (value.length < 4) {
          return '계좌번호는 최소 4자리 이상이어야 합니다'
        }
        if (value.length > 25) {
          return '계좌번호는 25자 이하여야 합니다'
        }
        if (!/^[0-9\-]+$/.test(value)) {
          return '계좌번호는 숫자와 하이픈만 입력 가능합니다'
        }
      }
      return null
    },
  }

  const {
    data: formData,
    updateField,
    validateAll,
    reset,
    errors,
    isValid,
  } = useFormValidation<PaymentMethodFormData>(validationRules, {
    initialData: {
      organizationId,
      name: '',
      type: 'cash',
      bankName: '',
      accountNumber: '',
      cardCompany: '',
      lastFourDigits: '',
    },
    mode: 'onChange',
    realTimeValidation: true,
  })

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      reset({
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
      reset({
        organizationId,
        name: '',
        type: 'cash',
        bankName: '',
        accountNumber: '',
        cardCompany: '',
        lastFourDigits: '',
      })
    }
  }, [initialData, organizationId, isOpen, reset])

  // 커스텀 validation 함수 (타입별 조건부 검증)
  const validateFormData = (): boolean => {
    const { isValid: basicIsValid } = validateAll()

    // 기본 validation 실패 시 조기 반환
    if (!basicIsValid) {
      return false
    }

    // 타입별 조건부 validation
    if (formData.type === 'card') {
      if (formData.lastFourDigits && !/^\d{4}$/.test(formData.lastFourDigits)) {
        showToast.error('카드 뒷 4자리는 숫자 4개여야 합니다')
        return false
      }
    }

    if (formData.type === 'account') {
      if (formData.accountNumber) {
        if (formData.accountNumber.length < 4) {
          showToast.error('계좌번호는 최소 4자리 이상이어야 합니다')
          return false
        }
        if (!/^[0-9\-]+$/.test(formData.accountNumber)) {
          showToast.error('계좌번호는 숫자와 하이픈만 입력 가능합니다')
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateFormData()) {
      showToast.error('입력 정보를 확인해주세요')
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
      const errorMessage =
        error instanceof Error ? error.message : '저장에 실패했습니다'
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
            <ValidatedInput
              label="카드사"
              placeholder="예: 신한카드, KB국민카드"
              description="카드사명을 입력하세요 (선택사항)"
              value={formData.cardCompany || ''}
              onValueChange={value => updateField('cardCompany', value)}
              error={errors.cardCompany}
              maxLength={100}
            />

            <ValidatedInput
              label="카드 뒷 4자리"
              placeholder="1234"
              description="카드번호 뒷 4자리를 입력하세요 (선택사항)"
              maxLength={4}
              value={formData.lastFourDigits || ''}
              onValueChange={value => updateField('lastFourDigits', value)}
              error={errors.lastFourDigits}
              validation={value => {
                if (
                  formData.type === 'card' &&
                  value &&
                  !/^\d{4}$/.test(value)
                ) {
                  return '카드 뒷 4자리는 숫자 4개여야 합니다'
                }
                return null
              }}
            />
          </>
        )

      case 'account':
        return (
          <>
            <ValidatedInput
              label="은행명"
              placeholder="예: 신한은행, KB국민은행"
              description="은행명을 입력하세요 (선택사항)"
              value={formData.bankName || ''}
              onValueChange={value => updateField('bankName', value)}
              error={errors.bankName}
              maxLength={100}
            />

            <ValidatedInput
              label="계좌번호"
              placeholder="123-456-789012"
              description="계좌번호를 입력하세요 (선택사항)"
              value={formData.accountNumber || ''}
              onValueChange={value => updateField('accountNumber', value)}
              error={errors.accountNumber}
              maxLength={25}
              validation={value => {
                if (formData.type === 'account' && value) {
                  if (value.length < 4) {
                    return '계좌번호는 최소 4자리 이상이어야 합니다'
                  }
                  if (!/^[0-9\-]+$/.test(value)) {
                    return '계좌번호는 숫자와 하이픈만 입력 가능합니다'
                  }
                }
                return null
              }}
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
              <ValidatedInput
                label="결제수단 이름"
                placeholder="예: 주거래 통장, 법인카드"
                description="결제수단을 구분할 수 있는 이름을 입력하세요"
                value={formData.name}
                onValueChange={value => updateField('name', value)}
                error={errors.name}
                isRequired
                maxLength={50}
              />

              <ValidatedSelect
                label="결제수단 유형"
                options={paymentMethodTypes}
                selectedKeys={new Set([formData.type])}
                onSelectionChange={keys => {
                  const selectedType = Array.from(
                    keys
                  )[0] as typeof formData.type
                  updateField('type', selectedType)
                  // 타입 변경 시 관련 필드 초기화
                  updateField('bankName', '')
                  updateField('accountNumber', '')
                  updateField('cardCompany', '')
                  updateField('lastFourDigits', '')
                }}
                error={errors.type}
                isRequired
              />

              {renderTypeSpecificFields()}

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  {formData.type === 'card' &&
                    '카드사와 뒷 4자리는 선택사항입니다.'}
                  {formData.type === 'account' &&
                    '은행명과 계좌번호는 선택사항입니다.'}
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
