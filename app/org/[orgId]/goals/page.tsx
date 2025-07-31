'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem,
  Chip,
} from '@heroui/react'
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { getGoals, createGoal, updateGoal, deleteGoal } from '@/lib/server-actions/goals'
import { handleServerActionResult } from '@/components/error/ErrorBoundary'
import { createClient } from '@/lib/supabase'
// Import Prisma types directly
import type { FinancialGoal } from '@prisma/client'

const goalTypes = [
  { key: 'asset_growth', label: '자산 증가' },
  { key: 'savings', label: '저축 목표' },
  { key: 'debt_reduction', label: '부채 감소' },
  { key: 'expense_reduction', label: '지출 절약' },
]

export default function GoalsPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string

  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    type: '',
    targetAmount: '',
    targetDate: '',
  })

  useEffect(() => {
    if (orgId) {
      loadGoals(orgId)
    }
  }, [orgId])

  const loadGoals = async (organizationId: string) => {
    try {
      setLoading(true)

      // 사용자 인증 상태 확인 (Supabase Auth 유지)
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        toast.error('사용자 인증에 실패했습니다.')
        return
      }

      if (!user) {
        toast.error('로그인이 필요합니다.')
        router.push('/login')
        return
      }

      // 서버 액션으로 목표 로드
      const goalsList = handleServerActionResult(await getGoals(organizationId)) || []
      
      // 새로 달성된 목표가 있는지 확인 (기존 로직 유지)
      const previousGoals = goals || []
      const newlyCompletedGoals = goalsList.filter((goal: FinancialGoal) => 
        goal.status === 'completed' && 
        (Number(goal.currentAmount || 0) / Number(goal.targetAmount)) * 100 >= 100 &&
        !previousGoals.find((existingGoal: FinancialGoal) => 
          existingGoal.id === goal.id && existingGoal.status === 'completed'
        )
      )

      // 달성 축하 메시지 표시
      newlyCompletedGoals.forEach((goal: FinancialGoal) => {
        toast.success(`🎉 축하합니다! "${goal.name}" 목표를 달성했습니다!`, {
          duration: 6000,
          style: {
            background: '#10B981',
            color: '#fff',
            fontSize: '16px',
          },
        })
      })

      setGoals(goalsList)
    } catch (error) {
      console.error('목표 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast.error(`목표 로드 실패: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    if (
      !orgId ||
      !formData.title ||
      !formData.type ||
      !formData.targetAmount ||
      !formData.targetDate
    ) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setCreating(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const goalData = {
        name: formData.title,
        category: formData.type,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        organizationId: orgId,
      }

      const goal = handleServerActionResult(await createGoal(goalData))
      
      // 새로 생성된 목표가 바로 달성된 경우 축하 메시지
      if (goal && goal.status === 'completed' && (Number(goal.currentAmount || 0) / Number(goal.targetAmount)) * 100 >= 100) {
        toast.success(`🎉 축하합니다! "${goal.name}" 목표를 바로 달성했습니다!`, {
          duration: 6000,
          style: {
            background: '#10B981',
            color: '#fff',
            fontSize: '16px',
          },
        })
      } else {
        toast.success('목표가 성공적으로 추가되었습니다!')
      }

      setFormData({
        title: '',
        type: '',
        targetAmount: '',
        targetDate: '',
      })
      onClose()
      await loadGoals(orgId)
    } catch (error) {
      console.error('목표 생성 중 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '목표 생성 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleEditGoal = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    setFormData({
      title: goal.name,
      type: goal.category || 'asset_growth',
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
    })
    onEditOpen()
  }

  const handleUpdateGoal = async () => {
    if (
      !selectedGoal ||
      !orgId ||
      !formData.title ||
      !formData.type ||
      !formData.targetAmount ||
      !formData.targetDate
    ) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setUpdating(true)

    try {
      const goalData = {
        id: selectedGoal.id,
        name: formData.title,
        category: formData.type,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        organizationId: orgId,
      }

      const goal = handleServerActionResult(await updateGoal(goalData))
      
      // 수정된 목표가 달성된 경우 축하 메시지
      if (goal && goal.status === 'completed' && (Number(goal.currentAmount || 0) / Number(goal.targetAmount)) * 100 >= 100 && selectedGoal?.status !== 'completed') {
        toast.success(`🎉 축하합니다! "${goal.name}" 목표를 달성했습니다!`, {
          duration: 6000,
          style: {
            background: '#10B981',
            color: '#fff',
            fontSize: '16px',
          },
        })
      } else {
        toast.success('목표가 성공적으로 수정되었습니다!')
      }

      setFormData({
        title: '',
        type: '',
        targetAmount: '',
        targetDate: '',
      })
      setSelectedGoal(null)
      onEditClose()
      await loadGoals(orgId)
    } catch (error) {
      console.error('목표 수정 중 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '목표 수정 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteGoal = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    onDeleteOpen()
  }

  const confirmDeleteGoal = async () => {
    if (!selectedGoal || !orgId) return

    setDeleting(true)

    try {
      const data = handleServerActionResult(await deleteGoal(selectedGoal.id, orgId))

      toast.success('목표가 성공적으로 삭제되었습니다!')
      setSelectedGoal(null)
      onDeleteClose()
      await loadGoals(orgId)
    } catch (error) {
      console.error('목표 삭제 중 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '목표 삭제 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getGoalTypeLabel = (type: string) => {
    return goalTypes.find(t => t.key === type)?.label || type
  }

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'asset_growth':
        return 'primary'
      case 'savings':
        return 'success'
      case 'debt_reduction':
        return 'warning'
      case 'expense_reduction':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'paused':
        return 'warning'
      default:
        return 'primary'
    }
  }

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getGoalProgress = (goal: FinancialGoal) => {
    const currentAmount = Number(goal.currentAmount || 0)
    const targetAmount = Number(goal.targetAmount)
    const achievementRate = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
    const remainingAmount = Math.max(0, targetAmount - currentAmount)
    const daysRemaining = getDaysRemaining(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '')
    
    // 현재 페이스로 목표 달성까지 걸리는 시간 계산
    const dailyProgress = currentAmount > 0 ? currentAmount / Math.max(1, new Date().getDate()) : 0
    const projectedDays = remainingAmount > 0 && dailyProgress > 0 
      ? Math.ceil(remainingAmount / dailyProgress) 
      : daysRemaining
    
    // 목표 달성을 위한 일일 권장 금액
    const dailyTargetToReach = daysRemaining > 0 ? remainingAmount / daysRemaining : 0
    
    // 진행 상태 분석
    const isOnTrack = projectedDays <= daysRemaining
    const daysAheadBehind = daysRemaining - projectedDays
    
    return {
      achievementRate,
      currentAmount,
      remainingAmount,
      daysRemaining,
      dailyTargetToReach,
      projectedDays,
      isOnTrack,
      daysAheadBehind,
      status: isOnTrack ? (daysAheadBehind > 7 ? 'ahead' : 'on-track') : 'behind'
    }
  }

  const getProgressStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead':
        return '🚀'
      case 'on-track':
        return '🎯'
      case 'behind':
        return '⚠️'
      default:
        return '📊'
    }
  }

  const getProgressStatusColor = (status: string) => {
    switch (status) {
      case 'ahead':
        return 'text-green-600'
      case 'on-track':
        return 'text-blue-600'
      case 'behind':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getProgressStatusMessage = (progress: any) => {
    if (progress.status === 'ahead') {
      return `목표보다 ${Math.abs(progress.daysAheadBehind)}일 빠른 속도`
    } else if (progress.status === 'behind') {
      return `목표보다 ${Math.abs(progress.daysAheadBehind)}일 느린 속도`
    } else {
      return '목표 달성 페이스 유지 중'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>목표를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">재정 목표</h1>
          <p className="text-gray-600">
            재정 목표를 설정하고 달성 과정을 추적하세요
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
        >
          새 목표 추가
        </Button>
      </div>

      {/* 목표 현황 요약 대시보드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">활성 목표</h3>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {goals.filter(g => g.status === 'active').length}개
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">완료된 목표</h3>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {goals.filter(g => g.status === 'completed').length}개
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">평균 달성률</h3>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-purple-600">
              {goals.length > 0
                ? (
                    goals.reduce(
                      (sum, goal) =>
                        sum + Math.max(0, (Number(goal.currentAmount || 0) / Number(goal.targetAmount)) * 100),
                      0
                    ) / goals.length
                  ).toFixed(1)
                : '0.0'}
              %
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">진행 상태</h3>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-1">
              {(() => {
                const activeGoals = goals.filter(g => g.status === 'active')
                const progressStats = activeGoals.map(goal => getGoalProgress(goal))
                const onTrack = progressStats.filter(p => p.status === 'on-track' || p.status === 'ahead').length
                const behind = progressStats.filter(p => p.status === 'behind').length
                
                return (
                  <>
                    <div className="text-sm text-green-600">순조: {onTrack}개</div>
                    <div className="text-sm text-orange-600">지연: {behind}개</div>
                  </>
                )
              })()}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 목표 목록 */}
      <div className="space-y-6">
        {goals.map(goal => {
          const progress = getGoalProgress(goal)
          
          return (
            <Card key={goal.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{goal.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Chip
                        color={getGoalTypeColor(goal.category || 'asset_growth') as any}
                        size="sm"
                        variant="flat"
                      >
                        {getGoalTypeLabel(goal.category || 'asset_growth')}
                      </Chip>
                      <Chip
                        color={getStatusColor(goal.status) as any}
                        size="sm"
                        variant="flat"
                      >
                        {goal.status === 'active'
                          ? '진행중'
                          : goal.status === 'completed'
                            ? '완료'
                            : '일시정지'}
                      </Chip>
                      {goal.status === 'active' && (
                        <Chip
                          color={progress.status === 'ahead' ? 'success' : progress.status === 'behind' ? 'warning' : 'primary'}
                          size="sm"
                          variant="flat"
                        >
                          {getProgressStatusIcon(progress.status)} {progress.status === 'ahead' ? '빠름' : progress.status === 'behind' ? '지연' : '순조'}
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => handleEditGoal(goal)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleDeleteGoal(goal)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {/* 진행 현황 상세 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">목표 금액</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(goal.targetAmount))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">현재 달성</p>
                      <p
                        className={`text-lg font-semibold ${
                          (Number(goal.currentAmount) || 0) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(Number(goal.currentAmount) || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">남은 금액</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(progress.remainingAmount)}
                      </p>
                    </div>
                  </div>

                  {/* 진행률 바와 달성률 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">달성률</span>
                      <span className={`text-sm font-semibold ${getProgressStatusColor(progress.status)}`}>
                        {progress.achievementRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.max(0, Math.min(100, progress.achievementRate))}
                      color={
                        progress.achievementRate >= 100
                          ? 'success'
                          : progress.achievementRate >= 50
                            ? 'primary'
                            : 'danger'
                      }
                      className="w-full"
                    />
                  </div>

                  {/* 진행 상태 및 피드백 */}
                  {goal.status === 'active' && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className={`text-sm font-medium ${getProgressStatusColor(progress.status)}`}>
                        {getProgressStatusIcon(progress.status)} {getProgressStatusMessage(progress)}
                      </div>
                      
                      {progress.daysRemaining > 0 && (
                        <div className="text-sm text-gray-600">
                          💡 <strong>권장 일일 진행:</strong> {formatCurrency(progress.dailyTargetToReach)}/일
                        </div>
                      )}
                      
                      {progress.projectedDays !== progress.daysRemaining && (
                        <div className="text-sm text-gray-600">
                          📊 <strong>현재 페이스:</strong> 약 {progress.projectedDays}일 후 달성 예상
                        </div>
                      )}
                    </div>
                  )}

                  {/* 날짜 정보 */}
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        목표일:{' '}
                        {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </div>
                    <div className={progress.daysRemaining <= 7 ? 'text-red-600 font-medium' : ''}>
                      {progress.daysRemaining > 0
                        ? `${progress.daysRemaining}일 남음`
                        : '기한 만료'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* 목표 추가 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>새 재정 목표 추가</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="목표 제목"
                placeholder="예: 2025년 자산 증가 목표"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />

              <Select
                label="목표 유형"
                placeholder="목표 유형을 선택하세요"
                selectedKeys={formData.type ? [formData.type] : []}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, type: selectedKey })
                }}
              >
                {goalTypes.map(type => (
                  <SelectItem key={type.key}>{type.label}</SelectItem>
                ))}
              </Select>

              <Input
                label="목표 금액"
                placeholder="0"
                type="number"
                value={formData.targetAmount}
                onChange={e =>
                  setFormData({ ...formData, targetAmount: e.target.value })
                }
                startContent={<span className="text-gray-500">₩</span>}
              />

              <Input
                label="목표 달성일"
                type="date"
                value={formData.targetDate}
                onChange={e =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleCreateGoal}
              isLoading={creating}
            >
              목표 추가
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 목표 수정 모달 */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalContent>
          <ModalHeader>재정 목표 수정</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="목표 제목"
                placeholder="예: 2025년 자산 증가 목표"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />

              <Select
                label="목표 유형"
                placeholder="목표 유형을 선택하세요"
                selectedKeys={formData.type ? [formData.type] : []}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, type: selectedKey })
                }}
              >
                {goalTypes.map(type => (
                  <SelectItem key={type.key}>{type.label}</SelectItem>
                ))}
              </Select>

              <Input
                label="목표 금액"
                placeholder="0"
                type="number"
                value={formData.targetAmount}
                onChange={e =>
                  setFormData({ ...formData, targetAmount: e.target.value })
                }
                startContent={<span className="text-gray-500">₩</span>}
              />

              <Input
                label="목표 달성일"
                type="date"
                value={formData.targetDate}
                onChange={e =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditClose}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleUpdateGoal}
              isLoading={updating}
            >
              수정하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 목표 삭제 확인 모달 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>목표 삭제</ModalHeader>
          <ModalBody>
            <p>정말로 이 목표를 삭제하시겠습니까?</p>
            {selectedGoal && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p>
                  <strong>제목:</strong> {selectedGoal.name}
                </p>
                <p>
                  <strong>목표 금액:</strong>{' '}
                  {formatCurrency(Number(selectedGoal.targetAmount))}
                </p>
                <p>
                  <strong>목표일:</strong>{' '}
                  {selectedGoal.targetDate ? new Date(selectedGoal.targetDate).toLocaleDateString(
                    'ko-KR'
                  ) : '-'}
                </p>
              </div>
            )}
            <p className="text-red-600 text-sm mt-2">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              취소
            </Button>
            <Button
              color="danger"
              onPress={confirmDeleteGoal}
              isLoading={deleting}
            >
              삭제하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Toast 알림 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}