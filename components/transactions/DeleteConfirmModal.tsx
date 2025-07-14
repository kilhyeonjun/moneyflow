'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react'
import { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onConfirm: () => void
  loading?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  transaction,
  onConfirm,
  loading = false,
}: DeleteConfirmModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>거래 삭제</ModalHeader>
        <ModalBody>
          <p>정말로 이 거래를 삭제하시겠습니까?</p>
          {transaction && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p>
                <strong>내용:</strong> {transaction.description}
              </p>
              <p>
                <strong>금액:</strong>{' '}
                {formatCurrency(Math.abs(transaction.amount))}
              </p>
              <p>
                <strong>날짜:</strong>{' '}
                {new Date(transaction.transaction_date).toLocaleDateString(
                  'ko-KR'
                )}
              </p>
            </div>
          )}
          <p className="text-red-600 text-sm mt-2">
            이 작업은 되돌릴 수 없습니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            취소
          </Button>
          <Button color="danger" onPress={onConfirm} isLoading={loading}>
            삭제하기
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
