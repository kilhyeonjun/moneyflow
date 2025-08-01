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
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { forwardRef, useImperativeHandle, useState } from 'react'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface AlertDialogProps {
  title?: string
  message: string
  type?: AlertType
  confirmText?: string
  onConfirm?: () => void
}

export interface AlertDialogRef {
  open: (props: AlertDialogProps) => void
  close: () => void
}

const AlertDialog = forwardRef<AlertDialogRef>((_, ref) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [alertProps, setAlertProps] = useState<AlertDialogProps>({
    message: '',
  })

  useImperativeHandle(ref, () => ({
    open: (props: AlertDialogProps) => {
      setAlertProps(props)
      onOpen()
    },
    close: onClose,
  }))

  const getIcon = () => {
    const iconProps = { size: 24, className: 'flex-shrink-0' }
    
    switch (alertProps.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="text-success flex-shrink-0" />
      case 'warning':
        return <AlertTriangle {...iconProps} className="text-warning flex-shrink-0" />
      case 'error':
        return <XCircle {...iconProps} className="text-danger flex-shrink-0" />
      default:
        return <Info {...iconProps} className="text-primary flex-shrink-0" />
    }
  }

  const getHeaderColor = () => {
    switch (alertProps.type) {
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-warning'
      case 'error':
        return 'text-danger'
      default:
        return 'text-primary'
    }
  }

  const handleConfirm = () => {
    alertProps.onConfirm?.()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="blur"
      closeButton={false}
      isDismissable={false}
      isKeyboardDismissDisabled={false}
      size="sm"
      classNames={{
        base: 'mx-4',
        body: 'py-6',
        footer: 'pt-0 pb-6',
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              {alertProps.title && (
                <h2 className={`text-lg font-semibold ${getHeaderColor()}`}>
                  {alertProps.title}
                </h2>
              )}
            </ModalHeader>
            <ModalBody>
              <div className="flex items-start gap-3">
                {getIcon()}
                <p className="text-sm text-foreground-700 leading-relaxed">
                  {alertProps.message}
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="primary"
                onPress={handleConfirm}
                className="w-full"
                size="md"
                autoFocus
              >
                {alertProps.confirmText || '확인'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
})

AlertDialog.displayName = 'AlertDialog'

export default AlertDialog