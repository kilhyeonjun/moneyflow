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
import { supabase } from '@/lib/supabase'

interface AssetSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  yearlyGoal: number
  achievementRate: number
}

interface AssetCategory {
  id: string
  name: string
  type: 'real_estate' | 'financial' | 'investment' | 'retirement' | 'cash'
  currentValue: number
  targetValue?: number
  items: AssetItem[]
}

interface AssetItem {
  id: string
  name: string
  currentValue: number
  lastUpdated: string
}

export default function AssetsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [assetSummary, setAssetSummary] = useState<AssetSummary>({
    totalAssets: 224380685,
    totalLiabilities: 200000000,
    netWorth: 24380685,
    yearlyGoal: 100000000,
    achievementRate: -224.4,
  })

  const [assetCategories] = useState<AssetCategory[]>([
    {
      id: '1',
      name: '부동산',
      type: 'real_estate',
      currentValue: 70010000,
      items: [
        { id: '1-1', name: '전세 보증금', currentValue: 60000000, lastUpdated: '2025-01-01' },
        { id: '1-2', name: '슬 청약통장', currentValue: 5350000, lastUpdated: '2025-01-01' },
        { id: '1-3', name: '준 청약통장', currentValue: 4660000, lastUpdated: '2025-01-01' },
      ],
    },
    {
      id: '2',
      name: '노후/연금',
      type: 'retirement',
      currentValue: 7187884,
      items: [
        { id: '2-1', name: '슬 IRP', currentValue: 3512222, lastUpdated: '2025-01-01' },
        { id: '2-2', name: '준 IRP', currentValue: 3675662, lastUpdated: '2025-01-01' },
      ],
    },
    {
      id: '3',
      name: '저축/투자',
      type: 'investment',
      currentValue: 147182801,
      items: [
        { id: '3-1', name: '국내주식', currentValue: 1002800, lastUpdated: '2025-01-01' },
        { id: '3-2', name: '해외주식', currentValue: 15962281, lastUpdated: '2025-01-01' },
        { id: '3-3', name: '예금', currentValue: 82000000, lastUpdated: '2025-01-01' },
        { id: '3-4', name: '현금', currentValue: 42217720, lastUpdated: '2025-01-01' },
        { id: '3-5', name: '청년도약계좌', currentValue: 6000000, lastUpdated: '2025-01-01' },
      ],
    },
  ])

  const [liabilities] = useState([
    { id: '1', name: '전세대출', amount: 200000000, type: 'mortgage', lastUpdated: '2025-01-01' },
  ])

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
      // TODO: Load actual asset data from database
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
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
        {assetCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                {getAssetIcon(category.type)}
                <div>
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(category.currentValue)}
                  </p>
                </div>
              </div>
              <Chip color="primary" variant="flat">
                {category.items.length}개 항목
              </Chip>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        업데이트: {new Date(item.lastUpdated).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(item.currentValue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
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
                      {liability.type === 'mortgage' ? '담보대출' : '기타'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(liability.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(liability.lastUpdated).toLocaleDateString('ko-KR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  )
}
