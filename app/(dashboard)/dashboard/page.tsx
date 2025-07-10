import { Card, CardBody, CardHeader } from '@heroui/react'
import { TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-600">가계부 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 수입</h3>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-green-600">₩3,500,000</div>
            <p className="text-xs text-gray-500">전월 대비 +12%</p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 지출</h3>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-red-600">₩2,100,000</div>
            <p className="text-xs text-gray-500">전월 대비 -5%</p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">이번 달 저축</h3>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-blue-600">₩1,400,000</div>
            <p className="text-xs text-gray-500">목표 달성률 93%</p>
          </CardBody>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">총 자산</h3>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardBody className="pt-0">
            <div className="text-2xl font-bold text-purple-600">₩45,200,000</div>
            <p className="text-xs text-gray-500">목표까지 54,800,000원</p>
          </CardBody>
        </Card>
      </div>      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold">최근 거래</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">마트 장보기</p>
                  <p className="text-sm text-gray-500">2025-01-08 • 식비</p>
                </div>
                <span className="text-red-600 font-semibold">-₩85,000</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">월급</p>
                  <p className="text-sm text-gray-500">2025-01-05 • 수입</p>
                </div>
                <span className="text-green-600 font-semibold">+₩3,500,000</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">정기적금</p>
                  <p className="text-sm text-gray-500">2025-01-03 • 저축</p>
                </div>
                <span className="text-blue-600 font-semibold">-₩500,000</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="p-6">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold">이번 달 목표</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">저축 목표</span>
                  <span className="text-sm text-gray-500">93%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '93%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">₩1,400,000 / ₩1,500,000</p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">지출 관리</span>
                  <span className="text-sm text-gray-500">70%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">₩2,100,000 / ₩3,000,000</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}