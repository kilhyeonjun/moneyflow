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
  Target,
  Home,
  PiggyBank,
  Wallet,
  CreditCard,
  Plus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// Prisma 타입 import
import type { Asset, AssetCategory, Liability, Organization } from '@prisma/client'

// 확장된 타입 정의
interface AssetWithCategory extends Asset {
  category: AssetCategory
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
      
      // 사용자 인증 상태 확인 (Supabase Auth 유지)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        toast.error('사용자 인증에 실패했습니다.')
        return
      }
      
      if (!user) {
        toast.error('로그인이 필요합니다.')
        router.push('/login')
        return
      }
      
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
      const response = await fetch(`/api/asset-categories?organizationId=${orgId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const categories = await response.json()
      setAssetCategories(categories || [])
      
    } catch (error) {
      console.error('자산 카테고리 로드 실패:', error)
      toast.error('자산 카테고리를 불러오는데 실패했습니다.')
    }
  }

  const loadAssets = async (orgId: string) => {
    try {
      const response = await fetch(`/api/assets?organizationId=${orgId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const assetsData = await response.json()
      setAssets(assetsData || [])
      
      // 자산 요약 계산
      const totalAssets = (assetsData || []).reduce((sum: number, asset: Asset) => 
        sum + Number(asset.currentValue), 0)
      updateAssetSummary(totalAssets)
      
    } catch (error) {
      console.error('자산 로드 실패:', error)
    }
  }

  const loadLiabilities = async (orgId: string) => {
    try {
      const response = await fetch(`/api/liabilities?organizationId=${orgId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const liabilitiesData = await response.json()
      setLiabilities(liabilitiesData || [])
      
      // 부채 요약 계산
      const totalLiabilities = (liabilitiesData || []).reduce((sum: number, liability: Liability) => 
        sum + Number(liability.currentAmount), 0)
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

      const assetData = {
        name: formData.name,
        description: formData.description || null,
        categoryId: formData.categoryId,
        currentValue: parseFloat(formData.currentValue),
        organizationId: selectedOrgId,
        createdBy: user.id,
      }

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create asset')
      }

      const newAsset = await response.json()
      
      toast.success('자산이 성공적으로 추가되었습니다! 🎉')
      
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        currentValue: '',
      })
      onClose()
      await loadAssets(selectedOrgId)
      
    } catch (error) {
      console.error('자산 생성 중 오류:', error)
      
      if (error instanceof Error) {
        toast.error(`자산 생성 실패: ${error.message}`)
      } else {
        toast.error('자산 생성 중 알 수 없는 오류가 발생했습니다.')
      }
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
      case 'cash':
        return <Wallet className="w-5 h-5 text-green-600" />
      default:
        return <Wallet className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
          <p className="text-gray-600">조직의 자산을 체계적으로 관리하세요</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
          isDisabled={assetCategories.length === 0}
        >
          자산 추가
        </Button>
      </div>

      {/* 카테고리 없음 경고 */}
      {assetCategories.length === 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-600">자산 카테고리가 없습니다</h3>
          </CardHeader>
          <CardBody>
            <p className="text-gray-700 mb-4">
              자산을 추가하려면 먼저 자산 카테고리가 필요합니다. 
              페이지를 새로고침하여 기본 카테고리를 생성하세요.
            </p>
            <Button 
              color="primary" 
              onClick={() => window.location.reload()}
            >
              페이지 새로고침
            </Button>
          </CardBody>
        </Card>
      )}

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
          const categoryAssets = assets.filter(asset => asset.categoryId === category.id)
          const categoryValue = categoryAssets.reduce((sum, asset) => sum + Number(asset.currentValue), 0)
          
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
                      <Button size="sm" color="primary" className="mt-2" onPress={onOpen}>
                        자산 추가
                      </Button>
                    </div>
                  ) : (
                    categoryAssets.map((asset) => (
                      <div key={asset.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          {asset.description && (
                            <p className="text-sm text-gray-500">{asset.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            업데이트: {new Date(asset.updatedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">
                            {formatCurrency(Number(asset.currentValue))}
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
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}
