'use client'

import React, { useState } from 'react'
import { Card, CardBody, CardHeader, Divider } from '@heroui/react'
import ValidatedCategorySelect, {
  categoryValidationRules,
} from '../form/ValidatedCategorySelect'
import CategoryBreadcrumb, { CategoryPath } from './CategoryBreadcrumb'
import type { TransactionType } from './CategoryIcon'

interface CategorySelectExampleProps {
  organizationId: string
}

/**
 * ValidatedCategorySelect 컴포넌트 사용 예제
 *
 * 이 컴포넌트는 실제 사용 방법을 보여주는 예제입니다.
 * 실제 프로젝트에서는 이 파일을 삭제하고 필요한 곳에서 컴포넌트를 직접 사용하세요.
 */
export default function CategorySelectExample({
  organizationId,
}: CategorySelectExampleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>()
  const [selectedCategoryData, setSelectedCategoryData] = useState<any>()
  const [error, setError] = useState<string>()

  const handleSelectionChange = (categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId)
    setError(undefined)
  }

  const handleSelectionChangeWithValidation = (
    categoryId: string | undefined,
    error: string | null,
    categoryData?: any
  ) => {
    setError(error || undefined)
    setSelectedCategoryData(categoryData)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">계층형 카테고리 선택 예제</h2>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          {/* 기본 사용법 */}
          <div>
            <h3 className="text-lg font-medium mb-2">기본 사용법</h3>
            <ValidatedCategorySelect
              organizationId={organizationId}
              value={selectedCategoryId}
              onSelectionChange={handleSelectionChange}
              onSelectionChangeWithValidation={
                handleSelectionChangeWithValidation
              }
              label="거래 카테고리"
              placeholder="카테고리를 선택하세요"
              isRequired
              validation={categoryValidationRules.required('카테고리')}
              error={error}
            />
          </div>

          {/* 선택된 값 표시 */}
          {selectedCategoryData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">선택된 카테고리 정보:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>ID:</strong> {selectedCategoryData.id}
                </div>
                <div>
                  <strong>이름:</strong> {selectedCategoryData.name}
                </div>
                <div>
                  <strong>유형:</strong> {selectedCategoryData.type}
                </div>
                {selectedCategoryData.parent && (
                  <div>
                    <strong>상위 카테고리:</strong>{' '}
                    {selectedCategoryData.parent.name}
                  </div>
                )}

                {/* Breadcrumb 표시 */}
                <div>
                  <strong>경로:</strong>
                  <div className="mt-1">
                    <CategoryBreadcrumb
                      selectedType={
                        selectedCategoryData.type as TransactionType
                      }
                      selectedParentCategory={selectedCategoryData.parent}
                      selectedCategory={selectedCategoryData}
                      readOnly
                    />
                  </div>
                </div>

                {/* 간단한 경로 텍스트 */}
                <div>
                  <strong>경로 (텍스트):</strong>
                  <CategoryPath
                    selectedType={selectedCategoryData.type as TransactionType}
                    selectedParentCategory={selectedCategoryData.parent}
                    selectedCategory={selectedCategoryData}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 다양한 옵션 예제 */}
          <Divider />
          <div>
            <h3 className="text-lg font-medium mb-2">다양한 옵션</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 작은 크기 */}
              <ValidatedCategorySelect
                organizationId={organizationId}
                size="sm"
                label="작은 크기"
                placeholder="작은 크기 선택"
                onSelectionChange={() => {}}
              />

              {/* 큰 크기 */}
              <ValidatedCategorySelect
                organizationId={organizationId}
                size="lg"
                label="큰 크기"
                placeholder="큰 크기 선택"
                onSelectionChange={() => {}}
              />

              {/* 테두리 변형 */}
              <ValidatedCategorySelect
                organizationId={organizationId}
                variant="bordered"
                label="테두리 변형"
                placeholder="테두리 변형 선택"
                onSelectionChange={() => {}}
              />

              {/* 선택 없음 옵션 제외 */}
              <ValidatedCategorySelect
                organizationId={organizationId}
                label="선택 없음 옵션 제외"
                placeholder="반드시 선택해야 함"
                includeNoneOption={false}
                onSelectionChange={() => {}}
              />
            </div>
          </div>

          {/* 검증 규칙 예제 */}
          <Divider />
          <div>
            <h3 className="text-lg font-medium mb-2">검증 규칙 예제</h3>

            <div className="space-y-4">
              {/* 수입 카테고리만 허용 */}
              <ValidatedCategorySelect
                organizationId={organizationId}
                label="수입 카테고리만 허용"
                placeholder="수입 카테고리를 선택하세요"
                validation={categoryValidationRules.combine(
                  categoryValidationRules.required('수입 카테고리'),
                  categoryValidationRules.allowedTypes(
                    ['income'],
                    '수입 카테고리'
                  )
                )}
                onSelectionChange={() => {}}
              />

              {/* 소분류만 허용 */}
              <ValidatedCategorySelect
                organizationId={organizationId}
                label="소분류만 허용"
                placeholder="세부 카테고리를 선택하세요"
                validation={categoryValidationRules.combine(
                  categoryValidationRules.required('카테고리'),
                  categoryValidationRules.childOnly('카테고리')
                )}
                onSelectionChange={() => {}}
              />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
