'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  useDisclosure,
} from '@heroui/react'
import { Plus, Wallet, AlertCircle, CreditCard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingStates'
import { showToast } from '@/lib/utils/toast'
import {
  handleServerActionResult,
  useErrorHandler,
} from '@/components/error/ErrorBoundary'
import { useDialog } from '@/components/ui/dialogs'
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus,
} from '@/lib/server-actions/payment-methods'
import PaymentMethodCard, { type PaymentMethodData } from './PaymentMethodCard'
import PaymentMethodForm, {
  type PaymentMethodFormData,
} from './PaymentMethodForm'

interface PaymentMethodListProps {
  organizationId: string
  organizationName: string
}

export default function PaymentMethodList({
  organizationId,
  organizationName,
}: PaymentMethodListProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<PaymentMethodData | null>(null)

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { handleError } = useErrorHandler()
  const dialog = useDialog()

  useEffect(() => {
    loadPaymentMethods()
  }, [organizationId])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const result = await getPaymentMethods(organizationId)
      const methods = handleServerActionResult(result)
      setPaymentMethods(methods as PaymentMethodData[])
    } catch (error) {
      const errorMessage = handleError(error, 'loadPaymentMethods')
      if (errorMessage) {
        showToast.error(
          `결제수단 목록을 불러오는데 실패했습니다: ${errorMessage}`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePaymentMethod = async (data: PaymentMethodFormData) => {
    const result = await createPaymentMethod(data)
    const newPaymentMethod = handleServerActionResult(result)

    setPaymentMethods(prev => [newPaymentMethod as PaymentMethodData, ...prev])
  }

  const handleUpdatePaymentMethod = async (data: PaymentMethodFormData) => {
    if (!data.id) return

    const result = await updatePaymentMethod(data as any)
    const updatedPaymentMethod = handleServerActionResult(result)

    setPaymentMethods(prev =>
      prev.map(pm =>
        pm.id === data.id ? (updatedPaymentMethod as PaymentMethodData) : pm
      )
    )
  }

  const handleFormSubmit = async (data: PaymentMethodFormData) => {
    if (editingPaymentMethod) {
      await handleUpdatePaymentMethod(data)
    } else {
      await handleCreatePaymentMethod(data)
    }
  }

  const handleEdit = (paymentMethod: PaymentMethodData) => {
    setEditingPaymentMethod(paymentMethod)
    onOpen()
  }

  const handleDelete = async (paymentMethodId: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId)
    if (!paymentMethod) return

    const confirmed = await dialog.confirmDanger(
      paymentMethod.transactionCount > 0
        ? `"${paymentMethod.name}" 결제수단을 삭제하시겠습니까?\n\n⚠️ 이 결제수단은 ${paymentMethod.transactionCount}개의 거래 기록을 가지고 있어 삭제할 수 없습니다.`
        : `"${paymentMethod.name}" 결제수단을 삭제하시겠습니까?\n\n삭제된 결제수단은 복구할 수 없습니다.`,
      {
        title: '결제수단 삭제',
        confirmText: paymentMethod.transactionCount > 0 ? '확인' : '삭제',
        cancelText: '취소',
      }
    )

    if (!confirmed || paymentMethod.transactionCount > 0) {
      return
    }

    try {
      const result = await deletePaymentMethod(paymentMethodId, organizationId)
      handleServerActionResult(result)

      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId))
      showToast.success('결제수단이 삭제되었습니다')
    } catch (error) {
      const errorMessage = handleError(error, 'handleDelete')
      if (errorMessage) {
        showToast.error(`결제수단 삭제에 실패했습니다: ${errorMessage}`)
      }
    }
  }

  const handleToggleStatus = async (paymentMethodId: string) => {
    try {
      const result = await togglePaymentMethodStatus(
        paymentMethodId,
        organizationId
      )
      const updatedPaymentMethod = handleServerActionResult(result)

      setPaymentMethods(prev =>
        prev.map(pm =>
          pm.id === paymentMethodId
            ? (updatedPaymentMethod as PaymentMethodData)
            : pm
        )
      )

      showToast.success(
        updatedPaymentMethod.isActive
          ? '결제수단이 활성화되었습니다'
          : '결제수단이 비활성화되었습니다'
      )
    } catch (error) {
      const errorMessage = handleError(error, 'handleToggleStatus')
      if (errorMessage) {
        showToast.error(`상태 변경에 실패했습니다: ${errorMessage}`)
      }
    }
  }

  const handleAddNew = () => {
    setEditingPaymentMethod(null)
    onOpen()
  }

  const handleClose = () => {
    setEditingPaymentMethod(null)
    onClose()
  }

  if (loading) {
    return <LoadingSpinner label="결제수단 목록을 불러오는 중..." />
  }

  const activePaymentMethods = paymentMethods.filter(pm => pm.isActive)
  const inactivePaymentMethods = paymentMethods.filter(pm => !pm.isActive)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <div>
                <h2 className="text-lg font-semibold">결제수단 관리</h2>
                <p className="text-sm text-gray-600">
                  {organizationName}의 결제수단
                </p>
              </div>
            </div>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={handleAddNew}
            >
              결제수단 추가
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                등록된 결제수단이 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                결제수단을 추가하여 거래 내역을 관리해보세요
              </p>
              <Button
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={handleAddNew}
              >
                첫 번째 결제수단 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 활성 결제수단 */}
              {activePaymentMethods.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 text-gray-900">
                    활성 결제수단 ({activePaymentMethods.length}개)
                  </h3>
                  <div className="grid gap-3">
                    {activePaymentMethods.map(paymentMethod => (
                      <PaymentMethodCard
                        key={paymentMethod.id}
                        paymentMethod={paymentMethod}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleStatus={handleToggleStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 비활성 결제수단 */}
              {inactivePaymentMethods.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-medium text-gray-900">
                      비활성 결제수단 ({inactivePaymentMethods.length}개)
                    </h3>
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="grid gap-3">
                    {inactivePaymentMethods.map(paymentMethod => (
                      <PaymentMethodCard
                        key={paymentMethod.id}
                        paymentMethod={paymentMethod}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleStatus={handleToggleStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 통계 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {paymentMethods.length}
                    </div>
                    <div className="text-sm text-gray-600">전체 결제수단</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {activePaymentMethods.length}
                    </div>
                    <div className="text-sm text-gray-600">활성 상태</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {paymentMethods.reduce(
                        (sum, pm) => sum + pm.transactionCount,
                        0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">총 거래 수</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <PaymentMethodForm
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleFormSubmit}
        initialData={editingPaymentMethod}
        organizationId={organizationId}
      />

      {/* Dialog Components */}
      {dialog.AlertDialogComponent}
      {dialog.ConfirmDialogComponent}
      {dialog.PromptDialogComponent}
    </>
  )
}
