'use client'

import { Button, Card, CardBody, CardHeader } from '@heroui/react'
import {
  AlertTriangle,
  CheckCircle,
  Info,
  MessageSquare,
  XCircle,
} from 'lucide-react'
import { useDialog } from './useDialog'

/**
 * Dialog 컴포넌트들의 사용 예제
 * 개발/테스트 용도로 사용
 */
export default function DialogExample() {
  const dialog = useDialog()

  const handleBasicAlert = () => {
    dialog.alert('기본 알림 메시지입니다.')
  }

  const handleSuccessAlert = () => {
    dialog.success('작업이 성공적으로 완료되었습니다!', {
      title: '성공',
      confirmText: '좋아요',
      onConfirm: () => console.log('Success alert confirmed'),
    })
  }

  const handleWarningAlert = () => {
    dialog.warning('주의사항이 있습니다. 확인해주세요.', {
      title: '주의',
      confirmText: '확인했습니다',
    })
  }

  const handleErrorAlert = () => {
    dialog.error('오류가 발생했습니다. 다시 시도해주세요.', {
      title: '오류',
      confirmText: '다시 시도',
    })
  }

  const handleBasicConfirm = async () => {
    const confirmed = await dialog.confirm('정말로 계속하시겠습니까?')
    console.log('Confirmed:', confirmed)

    if (confirmed) {
      dialog.success('확인되었습니다!')
    } else {
      dialog.alert('취소되었습니다.')
    }
  }

  const handleDangerConfirm = async () => {
    const confirmed = await dialog.confirmDanger(
      '이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?',
      {
        title: '위험한 작업',
        confirmText: '삭제',
        cancelText: '보관',
      }
    )

    if (confirmed) {
      dialog.error('삭제되었습니다!')
    } else {
      dialog.success('안전하게 보관됩니다.')
    }
  }

  const handleBasicPrompt = async () => {
    const result = await dialog.prompt('이름을 입력해주세요:', {
      title: '사용자 정보',
      placeholder: '홍길동',
      confirmText: '저장',
    })

    if (result) {
      dialog.success(`안녕하세요, ${result}님!`)
    } else {
      dialog.alert('입력이 취소되었습니다.')
    }
  }

  const handleValidatedPrompt = async () => {
    const result = await dialog.prompt('이메일 주소를 입력해주세요:', {
      title: '이메일 확인',
      inputType: 'email',
      placeholder: 'example@domain.com',
      validation: value => {
        if (!value.trim()) {
          return '이메일 주소를 입력해주세요.'
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return '올바른 이메일 형식이 아닙니다.'
        }
        return null
      },
      confirmText: '확인',
    })

    if (result) {
      dialog.success(`이메일 주소가 확인되었습니다: ${result}`)
    }
  }

  const handleNumberPrompt = async () => {
    const result = await dialog.prompt('나이를 입력해주세요:', {
      title: '나이 입력',
      inputType: 'number',
      placeholder: '25',
      defaultValue: '20',
      validation: value => {
        const age = parseInt(value)
        if (isNaN(age) || age < 1 || age > 150) {
          return '1-150 사이의 숫자를 입력해주세요.'
        }
        return null
      },
    })

    if (result) {
      dialog.success(`나이: ${result}세`)
    }
  }

  const handleAsyncConfirm = async () => {
    const confirmed = await dialog.confirm(
      '서버에 데이터를 저장하시겠습니까?',
      {
        title: '데이터 저장',
        onConfirm: async () => {
          // 비동기 작업 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 2000))
          console.log('Data saved to server')
        },
      }
    )

    if (confirmed) {
      dialog.success('데이터가 서버에 저장되었습니다!')
    }
  }

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Dialog 컴포넌트 예제</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Alert Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Alert Dialog 예제
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button variant="flat" onPress={handleBasicAlert}>
                기본 알림
              </Button>
              <Button
                color="success"
                variant="flat"
                onPress={handleSuccessAlert}
              >
                성공 알림
              </Button>
              <Button
                color="warning"
                variant="flat"
                onPress={handleWarningAlert}
              >
                경고 알림
              </Button>
              <Button color="danger" variant="flat" onPress={handleErrorAlert}>
                오류 알림
              </Button>
            </div>
          </div>

          {/* Confirm Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Confirm Dialog 예제
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                color="primary"
                variant="flat"
                onPress={handleBasicConfirm}
              >
                기본 확인
              </Button>
              <Button
                color="danger"
                variant="flat"
                onPress={handleDangerConfirm}
              >
                위험한 작업 확인
              </Button>
              <Button
                color="secondary"
                variant="flat"
                onPress={handleAsyncConfirm}
              >
                비동기 작업 확인
              </Button>
            </div>
          </div>

          {/* Prompt Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Prompt Dialog 예제
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                color="primary"
                variant="flat"
                onPress={handleBasicPrompt}
              >
                기본 입력
              </Button>
              <Button
                color="secondary"
                variant="flat"
                onPress={handleValidatedPrompt}
              >
                이메일 입력 (검증)
              </Button>
              <Button
                color="success"
                variant="flat"
                onPress={handleNumberPrompt}
              >
                숫자 입력 (검증)
              </Button>
            </div>
          </div>

          {/* Usage Notes */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">사용법 안내</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Alert: 단순 알림, 사용자 확인 필요</li>
              <li>• Confirm: 사용자 선택 필요 (확인/취소)</li>
              <li>• Prompt: 사용자 입력 받기 (텍스트, 검증 포함)</li>
              <li>• ESC 키로 취소, Enter 키로 확인 가능</li>
              <li>• 접근성: 키보드 네비게이션 및 스크린 리더 지원</li>
              <li>• 비동기 작업: onConfirm에서 Promise 반환 시 로딩 표시</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {/* Dialog Components */}
      {dialog.AlertDialogComponent}
      {dialog.ConfirmDialogComponent}
      {dialog.PromptDialogComponent}
    </>
  )
}
