'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  useDisclosure,
} from '@heroui/react'
import { Edit3 } from 'lucide-react'
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
} from 'react'

export interface PromptDialogProps {
  title?: string
  message: string
  placeholder?: string
  defaultValue?: string
  inputType?: 'text' | 'number' | 'email' | 'password' | 'url'
  confirmText?: string
  cancelText?: string
  validation?: (value: string) => string | null
  onConfirm?: (value: string) => void | Promise<void>
  onCancel?: () => void
}

export interface PromptDialogRef {
  open: (props: PromptDialogProps) => void
  close: () => void
}

const PromptDialog = forwardRef<PromptDialogRef>((_, ref) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()
  const [promptProps, setPromptProps] = useState<PromptDialogProps>({
    message: '',
  })
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    open: (props: PromptDialogProps) => {
      setPromptProps(props)
      setValue(props.defaultValue || '')
      setError(null)
      onOpen()
    },
    close: () => {
      setValue('')
      setError(null)
      onClose()
    },
  }))

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Delay focus to ensure modal animation is complete
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const validateInput = (inputValue: string): boolean => {
    if (promptProps.validation) {
      const validationError = promptProps.validation(inputValue)
      setError(validationError)
      return validationError === null
    }
    return true
  }

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    if (error) {
      // Clear error when user starts typing
      validateInput(newValue)
    }
  }

  const handleConfirm = async () => {
    if (!validateInput(value)) {
      inputRef.current?.focus()
      return
    }

    try {
      setIsLoading(true)
      await promptProps.onConfirm?.(value)
      setValue('')
      setError(null)
      onClose()
    } catch (error) {
      console.error('Prompt action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    promptProps.onCancel?.()
    setValue('')
    setError(null)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    }
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
              {promptProps.title && (
                <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Edit3 size={20} />
                  {promptProps.title}
                </h2>
              )}
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-foreground-700 leading-relaxed">
                  {promptProps.message}
                </p>
                <Input
                  ref={inputRef}
                  type={promptProps.inputType || 'text'}
                  placeholder={promptProps.placeholder}
                  value={value}
                  onValueChange={handleValueChange}
                  onKeyDown={handleKeyDown}
                  isInvalid={!!error}
                  errorMessage={error}
                  isDisabled={isLoading}
                  variant="bordered"
                  size="md"
                  classNames={{
                    inputWrapper: 'border-1',
                  }}
                />
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
                {promptProps.cancelText || '취소'}
              </Button>
              <Button
                color="primary"
                onPress={handleConfirm}
                isLoading={isLoading}
                isDisabled={!value.trim()}
                className="flex-1"
                size="md"
              >
                {promptProps.confirmText || '확인'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
})

PromptDialog.displayName = 'PromptDialog'

export default PromptDialog
