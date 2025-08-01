'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectItem,
  Avatar,
} from '@heroui/react'
import {
  Banknote,
  CreditCard,
  Building2,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import { handleServerActionResult, useErrorHandler } from '@/components/error/ErrorBoundary'
import { getPaymentMethods } from '@/lib/server-actions/payment-methods'
import type { PaymentMethodData } from './PaymentMethodCard'

interface PaymentMethodSelectProps {
  organizationId: string
  value?: string
  onSelectionChange: (paymentMethodId: string | undefined) => void
  label?: string
  placeholder?: string
  isRequired?: boolean
  isInvalid?: boolean
  errorMessage?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'flat' | 'bordered' | 'faded' | 'underlined'
  includeNoneOption?: boolean
  noneOptionLabel?: string
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return <Banknote className="w-4 h-4" />
    case 'card':
      return <CreditCard className="w-4 h-4" />
    case 'account':
      return <Building2 className="w-4 h-4" />
    case 'other':
      return <Wallet className="w-4 h-4" />
    default:
      return <Wallet className="w-4 h-4" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'cash':
      return 'text-green-600'
    case 'card':
      return 'text-blue-600'
    case 'account':
      return 'text-purple-600'
    case 'other':
      return 'text-gray-600'
    default:
      return 'text-gray-600'
  }
}

const getTypeName = (type: string) => {
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
      return type
  }
}

export default function PaymentMethodSelect({
  organizationId,
  value,
  onSelectionChange,
  label = '결제수단',
  placeholder = '결제수단을 선택하세요',
  isRequired = false,
  isInvalid = false,
  errorMessage,
  size = 'md',
  variant = 'flat',
  includeNoneOption = true,
  noneOptionLabel = '결제수단 없음',
}: PaymentMethodSelectProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const { handleError } = useErrorHandler()

  useEffect(() => {
    loadPaymentMethods()
  }, [organizationId])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const result = await getPaymentMethods(organizationId)
      const methods = handleServerActionResult(result)
      
      // 활성화된 결제수단만 필터링하고 최근 사용순으로 정렬
      const activeMethods = (methods as PaymentMethodData[])
        .filter(pm => pm.isActive)
        .sort((a, b) => {
          // 거래 수가 많은 순으로 정렬 (최근 사용한 것으로 간주)
          if (a.transactionCount !== b.transactionCount) {
            return b.transactionCount - a.transactionCount
          }
          // 거래 수가 같으면 생성일 순으로 정렬
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        })
      
      setPaymentMethods(activeMethods)
    } catch (error) {
      const errorMessage = handleError(error, 'loadPaymentMethods')
      if (errorMessage) {
        console.error('결제수단 목록 로드 실패:', errorMessage)
      }
      setPaymentMethods([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (keys: any) => {
    const selectedKey = Array.from(keys)[0] as string
    if (selectedKey === 'none') {
      onSelectionChange(undefined)
    } else {
      onSelectionChange(selectedKey)
    }
  }

  const getSubtitle = (paymentMethod: PaymentMethodData) => {
    if (paymentMethod.type === 'card') {
      return `${paymentMethod.cardCompany || '카드'} **** ${paymentMethod.lastFourDigits || '****'}`
    }
    if (paymentMethod.type === 'account') {
      return `${paymentMethod.bankName || '은행'} ${paymentMethod.accountNumber ? `****${paymentMethod.accountNumber.slice(-4)}` : '****'}`
    }
    return getTypeName(paymentMethod.type)
  }

  const selectedKeys = value ? [value] : includeNoneOption ? ['none'] : []

  return (
    <Select
      label={label}
      placeholder={loading ? '로딩 중...' : placeholder}
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      size={size}
      variant={variant}
      isLoading={loading}
      startContent={
        value && paymentMethods.length > 0 ? (
          (() => {
            const selectedMethod = paymentMethods.find(pm => pm.id === value)
            return selectedMethod ? (
              <div className={getTypeColor(selectedMethod.type)}>
                {getTypeIcon(selectedMethod.type)}
              </div>
            ) : null
          })()
        ) : null
      }
      renderValue={(items) => {
        if (items.length === 0) return placeholder

        return items.map((item) => {
          if (item.key === 'none') {
            return (
              <div key={item.key} className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>{noneOptionLabel}</span>
              </div>
            )
          }

          const paymentMethod = paymentMethods.find(pm => pm.id === item.key)
          if (!paymentMethod) return null

          return (
            <div key={item.key} className="flex items-center gap-2">
              <div className={getTypeColor(paymentMethod.type)}>
                {getTypeIcon(paymentMethod.type)}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{paymentMethod.name}</span>
                <span className="text-xs text-gray-500">
                  {getSubtitle(paymentMethod)}
                </span>
              </div>
            </div>
          )
        })
      }}
    >
      <>
        {includeNoneOption && (
          <SelectItem
            key="none"
            startContent={<AlertCircle className="w-4 h-4 text-gray-400" />}
            className="text-gray-500"
          >
            {noneOptionLabel}
          </SelectItem>
        )}
        
        {paymentMethods.map((paymentMethod) => (
          <SelectItem
            key={paymentMethod.id}
            startContent={
              <div className={getTypeColor(paymentMethod.type)}>
                {getTypeIcon(paymentMethod.type)}
              </div>
            }
            description={getSubtitle(paymentMethod)}
          >
            <div className="flex items-center justify-between w-full">
              <span>{paymentMethod.name}</span>
              {paymentMethod.transactionCount > 0 && (
                <span className="text-xs text-gray-400 ml-2">
                  {paymentMethod.transactionCount}건
                </span>
              )}
            </div>
          </SelectItem>
        ))}
        
        {!loading && paymentMethods.length === 0 && (
          <SelectItem
            key="empty"
            isDisabled
            startContent={<AlertCircle className="w-4 h-4 text-gray-400" />}
            className="text-gray-400"
          >
            등록된 결제수단이 없습니다
          </SelectItem>
        )}
      </>
    </Select>
  )
}