'use client'

import { Button, Card, CardBody, CardHeader } from '@heroui/react'
import { ArrowRight, BarChart3, Users, Target, Shield } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="w-full px-6 py-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">MoneyFlow</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link href="/signup">
              <Button color="primary">시작하기</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="w-full px-6 py-16">
        <div className="text-center mb-16 max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            가족과 팀을 위한
            <br />
            <span className="text-blue-600">스마트 가계부</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            조직 단위로 재정을 관리하고, 목표를 설정하며, 실시간으로 동기화되는
            종합 재정 관리 시스템
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/signup">
              <Button
                color="primary"
                size="lg"
                endContent={<ArrowRight className="h-5 w-5" />}
              >
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="bordered" size="lg">
                데모 보기
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-7xl mx-auto">
          <Card className="p-6">
            <CardHeader className="pb-4">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold">조직 단위 관리</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600">
                가족이나 팀 단위로 재정을 공유하고 함께 관리하세요
              </p>
            </CardBody>
          </Card>

          <Card className="p-6">
            <CardHeader className="pb-4">
              <BarChart3 className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold">3단계 분류</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600">
                수입/저축/지출을 체계적으로 분류하고 관리하세요
              </p>
            </CardBody>
          </Card>

          <Card className="p-6">
            <CardHeader className="pb-4">
              <Target className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold">목표 지향적</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600">
                자산 증가 목표를 설정하고 달성률을 추적하세요
              </p>
            </CardBody>
          </Card>

          <Card className="p-6">
            <CardHeader className="pb-4">
              <Shield className="h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold">실시간 동기화</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600">
                모든 구성원의 입력이 실시간으로 반영됩니다
              </p>
            </CardBody>
          </Card>
        </div>
        
        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-12 shadow-lg max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            지금 시작해보세요
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            무료로 시작하고, 가족과 팀의 재정을 체계적으로 관리해보세요
          </p>
          <Link href="/signup">
            <Button
              color="primary"
              size="lg"
              endContent={<ArrowRight className="h-5 w-5" />}
            >
              무료 계정 만들기
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 mt-16 border-t">
        <div className="text-center text-gray-600 max-w-7xl mx-auto">
          <p>&copy; 2025 MoneyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}