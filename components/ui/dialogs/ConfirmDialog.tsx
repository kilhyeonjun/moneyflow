'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@heroui/react'
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react'
import { forwardRef, useImperativeHandle, useState } from 'react'

export type ConfirmType = 'default' | 'warning' | 'danger'

export interface ConfirmDialogProps {
  title?: string
  message: string
  type?: ConfirmType
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

export interface ConfirmDialogRef {
  open: (props: ConfirmDialogProps) => void
  close: () => void
}

const ConfirmDialog = forwardRef<ConfirmDialogRef>((_, ref) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [confirmProps, setConfirmProps] = useState<ConfirmDialogProps>({
    message: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    open: (props: ConfirmDialogProps) => {
      setConfirmProps(props)
      onOpen()
    },
    close: onClose,
  }))

  const getIcon = () => {
    const iconProps = { size: 24, className: 'flex-shrink-0' }

    switch (confirmProps.type) {
      case 'warning':
        return (
          <AlertTriangle
            {...iconProps}
            className="text-warning flex-shrink-0"
          />
        )
      case 'danger':
        return <Trash2 {...iconProps} className="text-danger flex-shrink-0" />
      default:
        return (
          <HelpCircle {...iconProps} className="text-primary flex-shrink-0" />
        )
    }
  }

  const getHeaderColor = () => {
    switch (confirmProps.type) {
      case 'warning':
        return 'text-warning'
      case 'danger':
        return 'text-danger'
      default:
        return 'text-primary'
    }
  }

  const getConfirmButtonColor = () => {
    switch (confirmProps.type) {
      case 'danger':
        return 'danger'
      case 'warning':
        return 'warning'
      default:
        return 'primary'
    }
  }

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await confirmProps.onConfirm?.()
      onClose()
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    confirmProps.onCancel?.()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="blur"
      closeButton={false}
      isDismissable={!isLoading}
      isKeyboardDismissDisabled={isLoading}
      size="sm"
      classNames={{
        base: 'mx-4',
        body: 'py-6',
        footer: 'pt-0 pb-6',
      }}
    >
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              {confirmProps.title && (
                <h2 className={`text-lg font-semibold ${getHeaderColor()}`}>
                  {confirmProps.title}
                </h2>
              )}
            </ModalHeader>
            <ModalBody>
              <div className="flex items-start gap-3">
                {getIcon()}
                <p className="text-sm text-foreground-700 leading-relaxed">
                  {confirmProps.message}
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="light"
                onPress={handleCancel}
                isDisabled={isLoading}
                className="flex-1"
                size="md"
              >
                {confirmProps.cancelText || '취소'}
              </Button>
              <Button
                color={getConfirmButtonColor()}
                onPress={handleConfirm}
                isLoading={isLoading}
                className="flex-1"
                size="md"
                autoFocus
              >
                {confirmProps.confirmText || '확인'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
})

ConfirmDialog.displayName = 'ConfirmDialog'

export default ConfirmDialog
