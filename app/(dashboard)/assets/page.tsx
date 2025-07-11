'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Home,
  PiggyBank,
  Wallet,
  CreditCard,
  Plus,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type AssetCategory = Database['public']['Tables']['asset_categories']['Row']
type Asset = Database['public']['Tables']['assets']['Row']
type Liability = Database['public']['Tables']['liabilities']['Row']
type AssetInsert = Database['public']['Tables']['assets']['Insert']
type LiabilityInsert = Database['public']['Tables']['liabilities']['Insert']

interface AssetWithCategory extends Asset {
  asset_categories: AssetCategory | null
}

interface AssetSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  yearlyGoal: number
  achievementRate: number
}

export default function AssetsPage() {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    currentValue: '',
  })
  const [assetSummary, setAssetSummary] = useState<AssetSummary>({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    yearlyGoal: 100000000, // 기본 목표 1억원
    achievementRate: 0,
  })
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([])
  const [assets, setAssets] = useState<AssetWithCategory[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])

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
      await Promise.all([
        loadAssetCategories(storedOrgId),
        loadAssets(storedOrgId),
        loadLiabilities(storedOrgId)
      ])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssetCategories = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('organization_id', orgId)
        .order('name')

      if (error) throw error
      
      // 카테고리가 없으면 기본 카테고리 생성
      if (!data || data.length === 0) {
        await createDefaultAssetCategories(orgId)
        // 다시 로드
        const { data: newData, error: newError } = await supabase
          .from('asset_categories')
          .select('*')
          .eq('organization_id', orgId)
          .order('name')
        
        if (newError) throw newError
        setAssetCategories(newData || [])
      } else {
        setAssetCategories(data)
      }
    } catch (error) {
      console.error('자산 카테고리 로드 실패:', error)
    }
  }

  const createDefaultAssetCategories = async (orgId: string) => {
    try {
      const defaultCategories = [
        { name: '현금 및 예금', type: 'cash', icon: 'wallet', color: '#10B981' },
        { name: '투자 자산', type: 'investment', icon: 'trending-up', color: '#8B5CF6' },
        { name: '부동산', type: 'real_estate', icon: 'home', color: '#3B82F6' },
        { name: '퇴직연금', type: 'retirement', icon: 'piggy-bank', color: '#F59E0B' },
        { name: '기타 자산', type: 'other', icon: 'briefcase', color: '#6B7280' },
      ]

      const { error } = await supabase
        .from('asset_categories')
        .insert(
          defaultCategories.map(category => ({
            ...category,
            organization_id: orgId,
          }))
        )

      if (error) throw error
    } catch (error) {
      console.error('기본 자산 카테고리 생성 실패:', error)
    }
  }

  const loadAssets = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          asset_categories (*)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssets(data || [])
      
      // 자산 요약 계산
      const totalAssets = (data || []).reduce((sum, asset) => sum + asset.current_value, 0)
      updateAssetSummary(totalAssets)
    } catch (error) {
      console.error('자산 로드 실패:', error)
    }
  }

  const loadLiabilities = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLiabilities(data || [])
      
      // 부채 요약 계산
      const totalLiabilities = (data || []).reduce((sum, liability) => sum + liability.current_amount, 0)
      updateLiabilitySummary(totalLiabilities)
    } catch (error) {
      console.error('부채 로드 실패:', error)
    }
  }

  const updateAssetSummary = (totalAssets: number) => {
    setAssetSummary(prev => {
      const netWorth = totalAssets - prev.totalLiabilities
      const achievementRate = prev.yearlyGoal > 0 ? (netWorth / prev.yearlyGoal * 100) : 0
      
      return {
        ...prev,
        totalAssets,
        netWorth,
        achievementRate
      }
    })
  }

  const updateLiabilitySummary = (totalLiabilities: number) => {
    setAssetSummary(prev => {
      const netWorth = prev.totalAssets - totalLiabilities
      const achievementRate = prev.yearlyGoal > 0 ? (netWorth / prev.yearlyGoal * 100) : 0
      
      return {
        ...prev,
        totalLiabilities,
        netWorth,
        achievementRate
      }
    })
  }

  const handleCreateAsset = async () => {
    if (!selectedOrgId || !formData.name || !formData.categoryId || !formData.currentValue) {
      toast.error('모든 필수 필드를 입력해주세요.')
      return
    }

    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const assetData: AssetInsert = {
        name: formData.name,
        description: formData.description || null,
        category_id: formData.categoryId,
        current_value: parseFloat(formData.currentValue),
        organization_id: selectedOrgId,
        created_by: user.id,
      }

      const { error } = await supabase
        .from('assets')
        .insert([assetData])

      if (error) {
        console.error('자산 생성 실패:', error)
        toast.error('자산 생성에 실패했습니다.')
      } else {
        toast.success('자산이 성공적으로 추가되었습니다!')
        
        setFormData({
          name: '',
          description: '',
          categoryId: '',
          currentValue: '',
        })
        onClose()
        await loadAssets(selectedOrgId)
      }
    } catch (error) {
      console.error('자산 생성 중 오류:', error)
      toast.error('자산 생성 중 오류가 발생했습니다.')
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

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'real_estate':
        return <Home className="w-5 h-5 text-blue-600" />
      case 'retirement':
        return <PiggyBank className="w-5 h-5 text-green-600" />
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-purple-600" />
      case 'financial':
        return <Wallet className="w-5 h-5 text-orange-600" />
      default:
        return <Wallet className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>자산 현황을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">자산 관리</h1>
          <p className="text-gray-600">자산과 부채를 체계적으로 관리하고 목표를 추적하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
        >
          자산 추가
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">총 자산</h3>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(assetSummary.totalAssets)}
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">총 부채</h3>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(assetSummary.totalLiabilities)}
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">순 자산</h3>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(assetSummary.netWorth)}
            </div>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">목표 달성률</h3>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-purple-600">
              {assetSummary.achievementRate.toFixed(1)}%
            </div>
            <Progress
              value={Math.max(0, Math.min(100, assetSummary.achievementRate + 100))}
              className="mt-2"
              color={assetSummary.achievementRate >= 0 ? 'success' : 'danger'}
            />
          </CardBody>
        </Card>
      </div>

      {/* 자산 분류별 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {assetCategories.map((category) => {
          const categoryAssets = assets.filter(asset => asset.category_id === category.id)
          const categoryValue = categoryAssets.reduce((sum, asset) => sum + asset.current_value, 0)
          
          return (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  {getAssetIcon(category.type)}
                  <div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(categoryValue)}
                    </p>
                  </div>
                </div>
                <Chip color="primary" variant="flat">
                  {categoryAssets.length}개 항목
                </Chip>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {categoryAssets.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p>등록된 자산이 없습니다</p>
                      <Button size="sm" color="primary" className="mt-2">
                        자산 추가
                      </Button>
                    </div>
                  ) : (
                    categoryAssets.map((asset) => (
                      <div key={asset.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-gray-500">
                            업데이트: {new Date(asset.updated_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">
                            {formatCurrency(asset.current_value)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* 부채 현황 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">부채 현황</h3>
          </div>
        </CardHeader>
        <CardBody>
          {liabilities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>등록된 부채가 없습니다</p>
              <Button color="primary" className="mt-4">
                부채 추가
              </Button>
            </div>
          ) : (
            <Table aria-label="부채 현황 테이블">
              <TableHeader>
                <TableColumn>부채명</TableColumn>
                <TableColumn>종류</TableColumn>
                <TableColumn>금액</TableColumn>
                <TableColumn>최종 업데이트</TableColumn>
              </TableHeader>
              <TableBody>
                {liabilities.map((liability) => (
                  <TableRow key={liability.id}>
                    <TableCell>{liability.name}</TableCell>
                    <TableCell>
                      <Chip color="danger" size="sm" variant="flat">
                        {liability.type === 'mortgage' ? '담보대출' : 
                         liability.type === 'personal_loan' ? '신용대출' :
                         liability.type === 'credit_card' ? '신용카드' :
                         liability.type === 'student_loan' ? '학자금대출' : '기타'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(liability.current_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(liability.updated_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 자산 추가 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>새 자산 추가</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="자산명"
                placeholder="예: 우리은행 적금"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
              />

              <Select
                label="자산 카테고리"
                placeholder="카테고리를 선택하세요"
                selectedKeys={formData.categoryId ? [formData.categoryId] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, categoryId: selectedKey })
                }}
                isRequired
              >
                {assetCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="현재 가치"
                placeholder="0"
                type="number"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                startContent={<span className="text-gray-500">₩</span>}
                isRequired
              />

              <Textarea
                label="설명 (선택사항)"
                placeholder="자산에 대한 추가 정보를 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              취소
            </Button>
            <Button
              color="primary"
              onPress={handleCreateAsset}
              isLoading={creating}
            >
              자산 추가
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
