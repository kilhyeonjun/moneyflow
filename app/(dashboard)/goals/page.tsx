'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type FinancialGoal = Database['public']['Tables']['financial_goals']['Row']
type FinancialGoalInsert = Database['public']['Tables']['financial_goals']['Insert']

const goalTypes = [
  { key: 'asset_growth', label: '자산 증가' },
  { key: 'savings', label: '저축 목표' },
  { key: 'debt_reduction', label: '부채 감소' },
  { key: 'expense_reduction', label: '지출 절약' },
]

export default function GoalsPage() {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [goals, setGoals] = useState<FinancialGoal[]>([])

  const [formData, setFormData] = useState({
    title: '',
    type: '',
    targetAmount: '',
    targetDate: '',
  })

  useEffect(() => {
    checkOrganizationAndLoadData()
  }, [])

  const checkOrganizationAndLoadData = async () => {
    try {
      const storedOrgId = localStorage.getItem('selectedOrganization')
      
      if (!storedOrgId) {
        router.push('/organizations')
        return
      }

      setSelectedOrgId(storedOrgId)
      await loadGoals(storedOrgId)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGoals = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data || [])
    } catch (error) {
      console.error('목표 로드 실패:', error)
    }
  }

  const handleCreateGoal = async () => {
    if (!selectedOrgId || !formData.title || !formData.type || !formData.targetAmount || !formData.targetDate) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }

    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const goalData: FinancialGoalInsert = {
        title: formData.title,
        type: formData.type as any,
        target_amount: parseFloat(formData.targetAmount),
        target_date: formData.targetDate,
        organization_id: selectedOrgId,
        created_by: user.id,
      }

      const { error } = await supabase
        .from('financial_goals')
        .insert([goalData])

      if (error) {
        console.error('목표 생성 실패:', error)
        toast.error('목표 생성에 실패했습니다.')
      } else {
        toast.success('목표가 성공적으로 추가되었습니다!')
        
        setFormData({
          title: '',
          type: '',
          targetAmount: '',
          targetDate: '',
        })
        onClose()
        await loadGoals(selectedOrgId)
      }
    } catch (error) {
      console.error('목표 생성 중 오류:', error)
      toast.error('목표 생성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
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
          <p className="text-gray-600">재정 목표를 설정하고 달성 과정을 추적하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
        >
          새 목표 추가
        </Button>
      </div>

      {/* 목표 현황 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              {(goals.reduce((sum, goal) => sum + Math.max(0, goal.achievementRate), 0) / goals.length).toFixed(1)}%
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 목표 목록 */}
      <div className="space-y-6">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{goal.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip
                      color={getGoalTypeColor(goal.type) as any}
                      size="sm"
                      variant="flat"
                    >
                      {getGoalTypeLabel(goal.type)}
                    </Chip>
                    <Chip
                      color={getStatusColor(goal.status) as any}
                      size="sm"
                      variant="flat"
                    >
                      {goal.status === 'active' ? '진행중' : goal.status === 'completed' ? '완료' : '일시정지'}
                    </Chip>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button isIconOnly size="sm" variant="light">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button isIconOnly size="sm" variant="light" color="danger">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">목표 금액</p>
                    <p className="text-lg font-semibold">{formatCurrency(goal.target_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">현재 달성</p>
                    <p className={`text-lg font-semibold ${
                      goal.current_amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(goal.current_amount))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">달성률</p>
                    <p className={`text-lg font-semibold ${
                      goal.achievement_rate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {goal.achievement_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <Progress
                  value={Math.max(0, Math.min(100, goal.achievement_rate))}
                  color={goal.achievement_rate >= 100 ? 'success' : goal.achievement_rate >= 50 ? 'primary' : 'danger'}
                  className="w-full"
                />

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>목표일: {new Date(goal.target_date).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div>
                    {getDaysRemaining(goal.target_date) > 0 
                      ? `${getDaysRemaining(goal.target_date)}일 남음`
                      : '기한 만료'
                    }
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <Select
                label="목표 유형"
                placeholder="목표 유형을 선택하세요"
                selectedKeys={formData.type ? [formData.type] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, type: selectedKey })
                }}
              >
                {goalTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="목표 금액"
                placeholder="0"
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                startContent={<span className="text-gray-500">₩</span>}
              />

              <Input
                label="목표 달성일"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
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
