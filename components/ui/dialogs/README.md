# Dialog Components

HeroUI를 기반으로 구현된 React Dialog 컴포넌트들로, JavaScript의 `alert`, `confirm`, `prompt`를 대체합니다.

## 주요 특징

- ✅ **HeroUI 기반**: HeroUI의 Modal, Button, Input 컴포넌트 사용
- ✅ **TypeScript 지원**: 완전한 타입 안정성
- ✅ **접근성**: 키보드 네비게이션, ESC 키 처리, 포커스 관리
- ✅ **한국어 기본**: 한국어 기본 텍스트 제공
- ✅ **커스터마이징**: 모든 텍스트와 동작 커스터마이징 가능
- ✅ **비동기 지원**: Promise 기반 API, 로딩 상태 표시
- ✅ **사용하기 쉬운 Hook**: `useDialog` 훅으로 간편한 사용

## 컴포넌트 구성

### 1. AlertDialog
단순 알림용 다이얼로그

**타입**: `info` | `success` | `warning` | `error`

```tsx
const dialog = useDialog()

// 기본 알림
dialog.alert('알림 메시지입니다.')

// 타입별 알림
dialog.success('성공적으로 완료되었습니다!')
dialog.warning('주의사항이 있습니다.')
dialog.error('오류가 발생했습니다.')

// 커스터마이징
dialog.alert('커스텀 알림', {
  title: '제목',
  confirmText: '확인했습니다',
  onConfirm: () => console.log('확인됨')
})
```

### 2. ConfirmDialog
확인/취소 선택용 다이얼로그

**타입**: `default` | `warning` | `danger`

```tsx
// 기본 확인
const confirmed = await dialog.confirm('계속하시겠습니까?')
if (confirmed) {
  // 확인 시 동작
}

// 위험한 작업 확인
const deleted = await dialog.confirmDanger('정말로 삭제하시겠습니까?', {
  title: '삭제 확인',
  confirmText: '삭제',
  cancelText: '취소'
})

// 비동기 작업과 함께
const result = await dialog.confirm('서버에 저장하시겠습니까?', {
  onConfirm: async () => {
    await saveToServer() // 로딩 상태 자동 표시
  }
})
```

### 3. PromptDialog
사용자 입력 받기용 다이얼로그

**입력 타입**: `text` | `number` | `email` | `password` | `url`

```tsx
// 기본 입력
const name = await dialog.prompt('이름을 입력해주세요:')
if (name) {
  console.log(`Hello, ${name}!`)
}

// 유효성 검사와 함께
const email = await dialog.prompt('이메일을 입력해주세요:', {
  inputType: 'email',
  placeholder: 'example@domain.com',
  validation: (value) => {
    if (!value.includes('@')) {
      return '올바른 이메일 형식이 아닙니다.'
    }
    return null // 유효함
  }
})

// 숫자 입력
const age = await dialog.prompt('나이를 입력해주세요:', {
  inputType: 'number',
  defaultValue: '25',
  validation: (value) => {
    const num = parseInt(value)
    if (isNaN(num) || num < 1 || num > 150) {
      return '1-150 사이의 숫자를 입력해주세요.'
    }
    return null
  }
})
```

## 사용법

### 1. Hook 사용 (권장)

```tsx
import { useDialog } from '@/components/ui/dialogs'

function MyComponent() {
  const dialog = useDialog()
  
  const handleDelete = async () => {
    const confirmed = await dialog.confirmDanger(
      '이 항목을 삭제하시겠습니까?',
      { title: '삭제 확인' }
    )
    
    if (confirmed) {
      // 삭제 로직
      dialog.success('삭제되었습니다!')
    }
  }
  
  return (
    <>
      <button onClick={handleDelete}>삭제</button>
      
      {/* 필수: Dialog 컴포넌트들 렌더링 */}
      {dialog.AlertDialogComponent}
      {dialog.ConfirmDialogComponent}
      {dialog.PromptDialogComponent}
    </>
  )
}
```

### 2. Provider 사용

앱 전체에서 Dialog를 사용하려면 Provider를 사용하세요.

```tsx
import { createDialogProvider } from '@/components/ui/dialogs'

const DialogProvider = createDialogProvider()

function App() {
  return (
    <DialogProvider>
      <YourAppContent />
    </DialogProvider>
  )
}
```

### 3. 개별 컴포넌트 사용

```tsx
import { AlertDialog, ConfirmDialog, PromptDialog } from '@/components/ui/dialogs'
import { useRef } from 'react'

function MyComponent() {
  const alertRef = useRef<AlertDialogRef>(null)
  
  const showAlert = () => {
    alertRef.current?.open({
      message: '알림 메시지',
      type: 'success'
    })
  }
  
  return (
    <>
      <button onClick={showAlert}>알림 표시</button>
      <AlertDialog ref={alertRef} />
    </>
  )
}
```

## API 레퍼런스

### useDialog Hook

```tsx
interface DialogHookReturn {
  // Alert 함수들
  alert: (message: string, options?: Partial<AlertDialogProps>) => void
  success: (message: string, options?: Partial<AlertDialogProps>) => void
  warning: (message: string, options?: Partial<AlertDialogProps>) => void
  error: (message: string, options?: Partial<AlertDialogProps>) => void
  
  // Confirm 함수들
  confirm: (message: string, options?: Partial<ConfirmDialogProps>) => Promise<boolean>
  confirmDanger: (message: string, options?: Partial<ConfirmDialogProps>) => Promise<boolean>
  
  // Prompt 함수
  prompt: (message: string, options?: Partial<PromptDialogProps>) => Promise<string | null>
  
  // 렌더링할 컴포넌트들
  AlertDialogComponent: React.JSX.Element
  ConfirmDialogComponent: React.JSX.Element
  PromptDialogComponent: React.JSX.Element
}
```

### AlertDialogProps

```tsx
interface AlertDialogProps {
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  confirmText?: string
  onConfirm?: () => void
}
```

### ConfirmDialogProps

```tsx
interface ConfirmDialogProps {
  title?: string
  message: string
  type?: 'default' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}
```

### PromptDialogProps

```tsx
interface PromptDialogProps {
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
```

## 접근성 특징

- **키보드 네비게이션**: Tab, Shift+Tab으로 이동
- **ESC 키**: 다이얼로그 닫기
- **Enter 키**: 확인 버튼 실행 (Prompt에서는 입력 완료)
- **포커스 관리**: 다이얼로그 열릴 때 적절한 요소에 포커스
- **스크린 리더**: ARIA 속성으로 접근성 지원
- **색상 대비**: WCAG 가이드라인 준수

## 실제 사용 예제

### 결제수단 삭제 (PaymentMethodList.tsx)

```tsx
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
    await deletePaymentMethod(paymentMethodId, organizationId)
    setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId))
    showToast.success('결제수단이 삭제되었습니다')
  } catch (error) {
    showToast.error('삭제에 실패했습니다')
  }
}
```

## 스타일링

HeroUI의 테마 시스템을 활용하여 다크 모드와 커스텀 테마를 자동으로 지원합니다.

```tsx
// tailwind.config.js에서 HeroUI 색상 커스터마이징
module.exports = {
  // ... 기타 설정
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: "#your-color",
            // ... 기타 색상
          }
        }
      }
    })
  ]
}
```

## 마이그레이션 가이드

### 기존 window.confirm 대체

```tsx
// 기존 코드
if (window.confirm('삭제하시겠습니까?')) {
  deleteItem()
}

// 새로운 코드
const confirmed = await dialog.confirmDanger('삭제하시겠습니까?')
if (confirmed) {
  deleteItem()
}
```

### 기존 window.alert 대체

```tsx
// 기존 코드
window.alert('저장되었습니다!')

// 새로운 코드
dialog.success('저장되었습니다!')
```

### 기존 window.prompt 대체

```tsx
// 기존 코드
const name = window.prompt('이름을 입력하세요:')
if (name) {
  processName(name)
}

// 새로운 코드
const name = await dialog.prompt('이름을 입력하세요:')
if (name) {
  processName(name)
}
```