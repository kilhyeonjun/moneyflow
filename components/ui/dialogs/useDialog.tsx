'use client'

import { useRef } from 'react'
import AlertDialog, { type AlertDialogProps, type AlertDialogRef, type AlertType } from './AlertDialog'
import ConfirmDialog, { type ConfirmDialogProps, type ConfirmDialogRef, type ConfirmType } from './ConfirmDialog'
import PromptDialog, { type PromptDialogProps, type PromptDialogRef } from './PromptDialog'

export interface DialogHookReturn {
  // Alert functions
  alert: (message: string, options?: Partial<Omit<AlertDialogProps, 'message'>>) => void
  success: (message: string, options?: Partial<Omit<AlertDialogProps, 'message' | 'type'>>) => void
  warning: (message: string, options?: Partial<Omit<AlertDialogProps, 'message' | 'type'>>) => void
  error: (message: string, options?: Partial<Omit<AlertDialogProps, 'message' | 'type'>>) => void
  
  // Confirm functions
  confirm: (message: string, options?: Partial<Omit<ConfirmDialogProps, 'message'>>) => Promise<boolean>
  confirmDanger: (message: string, options?: Partial<Omit<ConfirmDialogProps, 'message' | 'type'>>) => Promise<boolean>
  
  // Prompt functions
  prompt: (message: string, options?: Partial<Omit<PromptDialogProps, 'message'>>) => Promise<string | null>
  
  // Dialog components to render
  AlertDialogComponent: React.JSX.Element
  ConfirmDialogComponent: React.JSX.Element
  PromptDialogComponent: React.JSX.Element
}

export const useDialog = (): DialogHookReturn => {
  const alertRef = useRef<AlertDialogRef>(null)
  const confirmRef = useRef<ConfirmDialogRef>(null)
  const promptRef = useRef<PromptDialogRef>(null)

  // Alert functions
  const alert = (message: string, options: Partial<Omit<AlertDialogProps, 'message'>> = {}) => {
    alertRef.current?.open({
      message,
      type: 'info',
      ...options,
    })
  }

  const success = (message: string, options: Partial<Omit<AlertDialogProps, 'message' | 'type'>> = {}) => {
    alertRef.current?.open({
      message,
      type: 'success',
      ...options,
    })
  }

  const warning = (message: string, options: Partial<Omit<AlertDialogProps, 'message' | 'type'>> = {}) => {
    alertRef.current?.open({
      message,
      type: 'warning',
      ...options,
    })
  }

  const error = (message: string, options: Partial<Omit<AlertDialogProps, 'message' | 'type'>> = {}) => {
    alertRef.current?.open({
      message,
      type: 'error',
      ...options,
    })
  }

  // Confirm functions
  const confirm = (message: string, options: Partial<Omit<ConfirmDialogProps, 'message'>> = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmRef.current?.open({
        message,
        type: 'default',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
        ...options,
      })
    })
  }

  const confirmDanger = (
    message: string, 
    options: Partial<Omit<ConfirmDialogProps, 'message' | 'type'>> = {}
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmRef.current?.open({
        message,
        type: 'danger',
        confirmText: '삭제',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
        ...options,
      })
    })
  }

  // Prompt function
  const prompt = (
    message: string, 
    options: Partial<Omit<PromptDialogProps, 'message'>> = {}
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      promptRef.current?.open({
        message,
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null),
        ...options,
      })
    })
  }

  return {
    // Alert functions
    alert,
    success,
    warning,
    error,
    
    // Confirm functions
    confirm,
    confirmDanger,
    
    // Prompt functions
    prompt,
    
    // Dialog components
    AlertDialogComponent: <AlertDialog ref={alertRef} />,
    ConfirmDialogComponent: <ConfirmDialog ref={confirmRef} />,
    PromptDialogComponent: <PromptDialog ref={promptRef} />,
  }
}

// Convenience function to create dialog context
export const createDialogProvider = () => {
  const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dialog = useDialog()
    
    return (
      <>
        {children}
        {dialog.AlertDialogComponent}
        {dialog.ConfirmDialogComponent}
        {dialog.PromptDialogComponent}
      </>
    )
  }
  
  return DialogProvider
}

// Re-export types for convenience
export type { AlertType, AlertDialogProps, ConfirmType, ConfirmDialogProps, PromptDialogProps }