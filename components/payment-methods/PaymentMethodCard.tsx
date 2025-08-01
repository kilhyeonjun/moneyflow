'use client'

import {
  Card,
  CardBody,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import {
  Banknote,
  CreditCard,
  Building2,
  Wallet,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  TrendingUp,
} from 'lucide-react'

export type PaymentMethodData = {
  id: string
  organizationId: string
  name: string
  type: 'cash' | 'card' | 'account' | 'other'
  bankName?: string | null
  accountNumber?: string | null
  cardCompany?: string | null
  lastFourDigits?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  transactionCount: number
}

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodData
  onEdit: (paymentMethod: PaymentMethodData) => void
  onDelete: (paymentMethodId: string) => void
  onToggleStatus: (paymentMethodId: string) => void
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return <Banknote className="w-5 h-5" />
    case 'card':
      return <CreditCard className="w-5 h-5" />
    case 'account':
      return <Building2 className="w-5 h-5" />
    case 'other':
      return <Wallet className="w-5 h-5" />
    default:
      return <Wallet className="w-5 h-5" />
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

const getTypeColorClass = (type: string) => {
  switch (type) {
    case 'cash':
      return 'success'
    case 'card':
      return 'primary'
    case 'account':
      return 'secondary'
    case 'other':
      return 'default'
    default:
      return 'default'
  }
}

export default function PaymentMethodCard({
  paymentMethod,
  onEdit,
  onDelete,
  onToggleStatus,
}: PaymentMethodCardProps) {
  const getSubtitle = () => {
    if (paymentMethod.type === 'card') {
      return `${paymentMethod.cardCompany || '카드사'} **** ${paymentMethod.lastFourDigits || '****'}`
    }
    if (paymentMethod.type === 'account') {
      return `${paymentMethod.bankName || '은행'} ${paymentMethod.accountNumber ? `****${paymentMethod.accountNumber.slice(-4)}` : '****'}`
    }
    return getTypeName(paymentMethod.type)
  }

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        !paymentMethod.isActive ? 'opacity-50' : ''
      }`}
    >
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={`${getTypeColor(paymentMethod.type)}`}>
              {getTypeIcon(paymentMethod.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {paymentMethod.name}
                </h3>
                <Chip
                  color={getTypeColorClass(paymentMethod.type) as any}
                  variant="flat"
                  size="sm"
                >
                  {getTypeName(paymentMethod.type)}
                </Chip>
                {!paymentMethod.isActive && (
                  <Chip color="danger" variant="flat" size="sm">
                    비활성
                  </Chip>
                )}
              </div>
              
              <p className="text-sm text-gray-600 truncate">
                {getSubtitle()}
              </p>
              
              {paymentMethod.transactionCount > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {paymentMethod.transactionCount}개 거래
                  </span>
                </div>
              )}
            </div>
          </div>

          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="결제수단 액션">
              <DropdownItem
                key="edit"
                startContent={<Edit className="w-4 h-4" />}
                onPress={() => onEdit(paymentMethod)}
              >
                수정
              </DropdownItem>
              <DropdownItem
                key="toggle"
                startContent={<Power className="w-4 h-4" />}
                onPress={() => onToggleStatus(paymentMethod.id)}
              >
                {paymentMethod.isActive ? '비활성화' : '활성화'}
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Trash2 className="w-4 h-4" />}
                onPress={() => onDelete(paymentMethod.id)}
                isDisabled={paymentMethod.transactionCount > 0}
              >
                {paymentMethod.transactionCount > 0 ? '거래 기록 있음' : '삭제'}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </CardBody>
    </Card>
  )
}