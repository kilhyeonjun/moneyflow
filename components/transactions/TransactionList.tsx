'use client'

import {
  Card,
  CardBody,
  CardHeader,
  Input,
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
  Button,
} from '@heroui/react'
import {
  Search,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
} from 'lucide-react'
import { useState } from 'react'
import { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: { name: string; transaction_type: string }
  payment_methods?: { name: string }
}

interface TransactionListProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  loading?: boolean
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  loading = false,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.categories?.name.toLowerCase().includes(searchLower) ||
      transaction.payment_methods?.name.toLowerCase().includes(searchLower)
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
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
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
              onChange={e => setSearchTerm(e.target.value)}
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
            <p className="text-gray-500">
              {searchTerm
                ? '다른 검색어를 시도해보세요'
                : '첫 번째 거래를 추가해보세요!'}
            </p>
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
              {filteredTransactions.map(transaction => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.transaction_date).toLocaleDateString(
                      'ko-KR'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(
                        transaction.categories?.transaction_type || ''
                      )}
                      <Chip
                        color={getTransactionColor(
                          transaction.categories?.transaction_type || ''
                        )}
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
                    <span
                      className={`font-semibold ${
                        transaction.categories?.transaction_type === 'income'
                          ? 'text-green-600'
                          : transaction.categories?.transaction_type ===
                              'expense'
                            ? 'text-red-600'
                            : 'text-blue-600'
                      }`}
                    >
                      {transaction.categories?.transaction_type === 'income'
                        ? '+'
                        : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="거래 액션">
                        <DropdownItem
                          key="edit"
                          startContent={<Edit className="w-4 h-4" />}
                          onPress={() => onEdit(transaction)}
                        >
                          수정
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<Trash2 className="w-4 h-4" />}
                          onPress={() => onDelete(transaction)}
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
  )
}
