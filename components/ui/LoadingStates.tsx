import React from 'react'
import { Spinner, Card, CardBody, Skeleton } from '@heroui/react'
import { Loader2 } from 'lucide-react'

// 기본 로딩 스피너
export function LoadingSpinner({
  size = 'md',
  label = '로딩 중...',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 ${className}`}
    >
      <Spinner size={size} color="primary" />
      {label && <p className="mt-2 text-sm text-gray-600">{label}</p>}
    </div>
  )
}

// 페이지 전체 로딩
export function PageLoading({
  message = '페이지를 불러오는 중...',
}: {
  message?: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// 카드 스켈레톤
export function CardSkeleton({
  rows = 3,
  showAvatar = false,
  className = '',
}: {
  rows?: number
  showAvatar?: boolean
  className?: string
}) {
  return (
    <Card className={className}>
      <CardBody className="space-y-3">
        {showAvatar && (
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
        )}

        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className={`h-4 rounded ${index === rows - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </CardBody>
    </Card>
  )
}

// 테이블 스켈레톤
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 헤더 */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-6 flex-1 rounded" />
        ))}
      </div>

      {/* 행들 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 flex-1 rounded"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// 대시보드 카드 스켈레톤
export function DashboardCardSkeleton() {
  return (
    <Card>
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="w-12 h-12 rounded-lg" />
        </div>
      </CardBody>
    </Card>
  )
}

// 차트 스켈레톤
export function ChartSkeleton({
  height = 300,
  className = '',
}: {
  height?: number
  className?: string
}) {
  return (
    <Card className={className}>
      <CardBody className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-end space-x-2">
                {Array.from({ length: 12 }).map((_, barIndex) => (
                  <Skeleton
                    key={barIndex}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${Math.random() * (height - 100) + 50}px`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-center space-x-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// 리스트 아이템 스켈레톤
export function ListItemSkeleton({
  showIcon = true,
  showSecondaryText = true,
  showAction = true,
}: {
  showIcon?: boolean
  showSecondaryText?: boolean
  showAction?: boolean
}) {
  return (
    <div className="flex items-center space-x-3 p-3">
      {showIcon && <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />}

      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        {showSecondaryText && <Skeleton className="h-3 w-1/2 rounded" />}
      </div>

      {showAction && <Skeleton className="w-8 h-8 rounded flex-shrink-0" />}
    </div>
  )
}

// 거래 목록 스켈레톤
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, index) => (
        <ListItemSkeleton
          key={index}
          showIcon={true}
          showSecondaryText={true}
          showAction={true}
        />
      ))}
    </div>
  )
}

// 자산 카드 스켈레톤
export function AssetCardSkeleton() {
  return (
    <Card>
      <CardBody className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="w-6 h-6 rounded" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />

          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// 빈 상태 컴포넌트
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  )
}
