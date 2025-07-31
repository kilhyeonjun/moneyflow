'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
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
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// Prisma 타입 import
import type {
  Asset,
  AssetCategory,
  Liability,
  Organization,
} from '@prisma/client'

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
  const [selectedAsset, setSelectedAsset] = useState<AssetWithCategory | null>(
    null
  )

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    currentValue: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    currentValue: '',
    targetValue: '',
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
    if (orgId) {
      loadAssetData()
    }
  }, [orgId])

  const loadAssetData = async () => {
    try {
      setLoading(true)

      // 사용자 인증 상태 확인 (Supabase Auth 유지)
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

      await Promise.all([
        loadAssetCategories(orgId),
        loadAssets(orgId),
        loadLiabilities(orgId),
      ])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssetCategories = async (orgId: string) => {
    try {
      const response = await fetch(
        `/api/asset-categories?organizationId=${orgId}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const categories = await response.json()

      // 카테고리가 없으면 기본 카테고리 생성
      if (!categories || categories.length === 0) {
        await createDefaultCategories(orgId)
        // 다시 카테고리 로드
        const retryResponse = await fetch(
          `/api/asset-categories?organizationId=${orgId}`
        )
        if (retryResponse.ok) {
          const retryCategories = await retryResponse.json()
          setAssetCategories(retryCategories || [])
        }
      } else {
        setAssetCategories(categories)
      }
    } catch (error) {
      console.error('자산 카테고리 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast.error(`자산 카테고리 로드 실패: ${errorMessage}`)
    }
  }

  const createDefaultCategories = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/initial-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create initial data')
      }

      const result = await response.json()
      console.log('초기 데이터 생성 완료:', result)
      toast.success('기본 카테고리가 생성되었습니다!')
    } catch (error) {
      console.error('기본 카테고리 생성 실패:', error)
      toast.error('기본 카테고리 생성에 실패했습니다.')
    }
  }

  const loadAssets = async (orgId: string) => {
    try {
      const response = await fetch(`/api/assets?organizationId=${orgId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const assetsData = await response.json()
      setAssets(assetsData || [])

      // 자산 요약 계산
      const totalAssets = (assetsData || []).reduce(
        (sum: number, asset: Asset) => sum + Number(asset.currentValue),
        0
      )
      updateAssetSummary(totalAssets)
    } catch (error) {
      console.error('자산 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast.error(`자산 로드 실패: ${errorMessage}`)
    }
  }

  const loadLiabilities = async (orgId: string) => {
    try {
      const response = await fetch(`/api/liabilities?organizationId=${orgId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const liabilitiesData = await response.json()
      setLiabilities(liabilitiesData || [])

      // 부채 요약 계산
      const totalLiabilities = (liabilitiesData || []).reduce(
        (sum: number, liability: Liability) =>
          sum + Number(liability.currentAmount),
        0
      )
      updateLiabilitySummary(totalLiabilities)
    } catch (error) {
      console.error('부채 로드 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast.error(`부채 로드 실패: ${errorMessage}`)
    }
  }

  const updateAssetSummary = (totalAssets: number) => {
    setAssetSummary(prev => {
      const netWorth = totalAssets - prev.totalLiabilities
      const achievementRate =
        prev.yearlyGoal > 0 ? (netWorth / prev.yearlyGoal) * 100 : 0

      return {
        ...prev,
        totalAssets,
        netWorth,
        achievementRate,
      }
    })
  }

  const updateLiabilitySummary = (totalLiabilities: number) => {
    setAssetSummary(prev => {
      const netWorth = prev.totalAssets - totalLiabilities
      const achievementRate =
        prev.yearlyGoal > 0 ? (netWorth / prev.yearlyGoal) * 100 : 0

      return {
        ...prev,
        totalLiabilities,
        netWorth,
        achievementRate,
      }
    })
  }

  const handleCreateAsset = async () => {
    if (
      !orgId ||
      !formData.name ||
      !formData.categoryId ||
      !formData.currentValue
    ) {
      toast.error('모든 필수 필드를 입력해주세요.')
      return
    }

    setCreating(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const assetData = {
        name: formData.name,
        description: formData.description || null,
        categoryId: formData.categoryId,
        currentValue: parseFloat(formData.currentValue),
        organizationId: orgId,
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
      await loadAssets(orgId)
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

  const handleEditAsset = (asset: AssetWithCategory) => {
    setSelectedAsset(asset)
    setEditFormData({
      name: asset.name,
      description: asset.description ?? '',
      categoryId: asset.categoryId as string,
      currentValue: asset.currentValue.toString(),
      targetValue: asset.targetValue ? asset.targetValue.toString() : '',
    })
    onEditOpen()
  }

  const handleUpdateAsset = async () => {
    if (!selectedAsset || !orgId) {
      toast.error('선택된 자산이 없습니다.')
      return
    }

    if (
      !editFormData.name ||
      !editFormData.categoryId ||
      !editFormData.currentValue
    ) {
      toast.error('모든 필수 필드를 입력해주세요.')
      return
    }

    setUpdating(true)

    try {
      const assetData = {
        id: selectedAsset.id,
        name: editFormData.name,
        description: editFormData.description || null,
        categoryId: editFormData.categoryId,
        currentValue: parseFloat(editFormData.currentValue),
        targetValue: editFormData.targetValue
          ? parseFloat(editFormData.targetValue)
          : null,
        organizationId: orgId,
      }

      const response = await fetch('/api/assets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update asset')
      }

      toast.success('자산이 성공적으로 수정되었습니다! ✅')

      onEditClose()
      await loadAssets(orgId)
    } catch (error) {
      console.error('자산 수정 중 오류:', error)

      if (error instanceof Error) {
        toast.error(`자산 수정 실패: ${error.message}`)
      } else {
        toast.error('자산 수정 중 알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteAsset = (asset: AssetWithCategory) => {
    setSelectedAsset(asset)
    onDeleteOpen()
  }

  const confirmDeleteAsset = async () => {
    if (!selectedAsset || !orgId) {
      toast.error('선택된 자산이 없습니다.')
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(
        `/api/assets?id=${selectedAsset.id}&organizationId=${orgId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete asset')
      }

      toast.success('자산이 성공적으로 삭제되었습니다! 🗑️')

      onDeleteClose()
      await loadAssets(orgId)
    } catch (error) {
      console.error('자산 삭제 중 오류:', error)

      if (error instanceof Error) {
        toast.error(`자산 삭제 실패: ${error.message}`)
      } else {
        toast.error('자산 삭제 중 알 수 없는 오류가 발생했습니다.')
      }
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
            <h3 className="text-lg font-semibold text-red-600">
              자산 카테고리가 없습니다
            </h3>
          </CardHeader>
          <CardBody>
            <p className="text-gray-700 mb-4">
              자산을 추가하려면 먼저 자산 카테고리가 필요합니다. 페이지를
              새로고침하여 기본 카테고리를 생성하세요.
            </p>
            <Button color="primary" onClick={() => window.location.reload()}>
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
              value={Math.max(
                0,
                Math.min(100, assetSummary.achievementRate + 100)
              )}
              className="mt-2"
              color={assetSummary.achievementRate >= 0 ? 'success' : 'danger'}
            />
          </CardBody>
        </Card>
      </div>

      {/* 자산 분류별 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {assetCategories.map(category => {
          const categoryAssets = assets.filter(
            asset => asset.categoryId === category.id
          )
          const categoryValue = categoryAssets.reduce(
            (sum, asset) => sum + Number(asset.currentValue),
            0
          )

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
                      <Button
                        size="sm"
                        color="primary"
                        className="mt-2"
                        onPress={onOpen}
                      >
                        자산 추가
                      </Button>
                    </div>
                  ) : (
                    categoryAssets.map(asset => (
                      <div
                        key={asset.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{asset.name}</p>
                          {asset.description && (
                            <p className="text-sm text-gray-500">
                              {asset.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            업데이트:{' '}
                            {asset.updatedAt
                              ? new Date(asset.updatedAt).toLocaleDateString(
                                  'ko-KR'
                                )
                              : '-'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(Number(asset.currentValue))}
                            </p>
                          </div>
                          <Dropdown>
                            <DropdownTrigger>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="자산 관리">
                              <DropdownItem
                                key="edit"
                                startContent={<Edit className="w-4 h-4" />}
                                onPress={() => handleEditAsset(asset)}
                              >
                                수정
                              </DropdownItem>
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                startContent={<Trash2 className="w-4 h-4" />}
                                onPress={() => handleDeleteAsset(asset)}
                              >
                                삭제
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
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
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                isRequired
              />

              <Select
                label="자산 카테고리"
                placeholder="카테고리를 선택하세요"
                selectedKeys={formData.categoryId ? [formData.categoryId] : []}
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setFormData({ ...formData, categoryId: selectedKey })
                }}
                isRequired
              >
                {assetCategories.map(category => (
                  <SelectItem key={category.id}>{category.name}</SelectItem>
                ))}
              </Select>

              <Input
                label="현재 가치"
                placeholder="0"
                type="number"
                value={formData.currentValue}
                onChange={e =>
                  setFormData({ ...formData, currentValue: e.target.value })
                }
                startContent={<span className="text-gray-500">₩</span>}
                isRequired
              />

              <Textarea
                label="설명 (선택사항)"
                placeholder="자산에 대한 추가 정보를 입력하세요"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
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
              onPress={handleCreateAsset}
              isLoading={creating}
            >
              자산 추가
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 자산 수정 모달 */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalContent>
          <ModalHeader>자산 수정</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="자산명"
                placeholder="예: 우리은행 적금"
                value={editFormData.name}
                onChange={e =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                isRequired
              />

              <Select
                label="자산 카테고리"
                placeholder="카테고리를 선택하세요"
                selectedKeys={
                  editFormData.categoryId ? [editFormData.categoryId] : []
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys)[0] as string
                  setEditFormData({ ...editFormData, categoryId: selectedKey })
                }}
                isRequired
              >
                {assetCategories.map(category => (
                  <SelectItem key={category.id}>{category.name}</SelectItem>
                ))}
              </Select>

              <Input
                label="현재 가치"
                placeholder="0"
                type="number"
                value={editFormData.currentValue}
                onChange={e =>
                  setEditFormData({
                    ...editFormData,
                    currentValue: e.target.value,
                  })
                }
                startContent={<span className="text-gray-500">₩</span>}
                isRequired
              />

              <Input
                label="목표 가치 (선택사항)"
                placeholder="0"
                type="number"
                value={editFormData.targetValue}
                onChange={e =>
                  setEditFormData({
                    ...editFormData,
                    targetValue: e.target.value,
                  })
                }
                startContent={<span className="text-gray-500">₩</span>}
              />

              <Textarea
                label="설명 (선택사항)"
                placeholder="자산에 대한 추가 정보를 입력하세요"
                value={editFormData.description}
                onChange={e =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
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
              onPress={handleUpdateAsset}
              isLoading={updating}
            >
              수정 완료
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 자산 삭제 확인 모달 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader className="text-danger">자산 삭제 확인</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">
                    정말로 이 자산을 삭제하시겠습니까?
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
              </div>

              {selectedAsset && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedAsset.name}</p>
                  <p className="text-sm text-gray-600">
                    현재 가치:{' '}
                    {formatCurrency(Number(selectedAsset.currentValue))}
                  </p>
                  {selectedAsset.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedAsset.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              취소
            </Button>
            <Button
              color="danger"
              onPress={confirmDeleteAsset}
              isLoading={deleting}
            >
              삭제
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