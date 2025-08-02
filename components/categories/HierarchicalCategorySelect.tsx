'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Divider,
  Listbox,
  ListboxItem,
  Chip,
  useDisclosure,
} from '@heroui/react'
import { Search, Plus, ChevronLeft, Check } from 'lucide-react'
import {
  handleServerActionResult,
  useErrorHandler,
} from '@/components/error/ErrorBoundary'
import {
  getCategoriesByType,
  getAllCategories,
} from '@/lib/server-actions/categories'
import CategoryIcon, {
  getTypeName,
  CategoryNameIcon,
  type TransactionType,
} from './CategoryIcon'
import CategoryBreadcrumb from './CategoryBreadcrumb'

interface CategoryData {
  id: string
  name: string
  type: TransactionType
  parentId: string | null
  displayOrder: number
  isActive: boolean
  parent: {
    id: string
    name: string
    type: TransactionType
  } | null
  children: {
    id: string
    name: string
    type: TransactionType
    displayOrder: number
    isActive: boolean
  }[]
  transactionCount: number
}

interface HierarchicalCategorySelectProps {
  /** 조직 ID */
  organizationId: string
  /** 초기 선택된 카테고리 ID */
  value?: string
  /** 선택 변경 시 호출되는 콜백 */
  onSelectionChange: (
    categoryId: string | undefined,
    categoryData?: CategoryData
  ) => void
  /** 라벨 */
  label?: string
  /** 플레이스홀더 */
  placeholder?: string
  /** 필수 필드 여부 */
  isRequired?: boolean
  /** 에러 상태 */
  isInvalid?: boolean
  /** 에러 메시지 */
  errorMessage?: string
  /** 크기 */
  size?: 'sm' | 'md' | 'lg'
  /** 변형 */
  variant?:
    | 'flat'
    | 'bordered'
    | 'faded'
    | 'light'
    | 'solid'
    | 'shadow'
    | 'ghost'
  /** 선택 없음 옵션 포함 여부 */
  includeNoneOption?: boolean
  /** 선택 없음 옵션 라벨 */
  noneOptionLabel?: string
  /** 읽기 전용 모드 */
  readOnly?: boolean
  /** 비활성화 상태 */
  isDisabled?: boolean
}

/**
 * 계층형 카테고리 선택 컴포넌트
 *
 * 기능:
 * - 거래 유형 → 대분류 → 소분류 단계별 선택
 * - 모달을 통한 계층형 드롭다운 인터페이스
 * - 검색 기능
 * - 카테고리 트리 구조 표시
 * - Breadcrumb 네비게이션
 */
export default function HierarchicalCategorySelect({
  organizationId,
  value,
  onSelectionChange,
  label = '카테고리',
  placeholder = '카테고리를 선택하세요',
  isRequired = false,
  isInvalid = false,
  errorMessage,
  size = 'md',
  variant = 'flat',
  includeNoneOption = true,
  noneOptionLabel = '카테고리 없음',
  readOnly = false,
  isDisabled = false,
}: HierarchicalCategorySelectProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { handleError } = useErrorHandler()

  // 상태 관리
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allCategories, setAllCategories] = useState<CategoryData[]>([]) // 전체 카테고리 캐시
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [selectedCategoryData, setSelectedCategoryData] =
    useState<CategoryData | null>(null)

  // 거래 유형 목록
  const transactionTypes: TransactionType[] = [
    'income',
    'savings',
    'fixed_expense',
    'variable_expense',
  ]

  // 전체 카테고리 로드 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    if (organizationId) {
      loadAllCategories()
    }
  }, [organizationId])

  // 선택된 카테고리 정보 설정 (캐시된 데이터에서 찾기)
  useEffect(() => {
    if (value && allCategories.length > 0) {
      const foundCategory = allCategories.find(cat => cat.id === value)
      if (foundCategory) {
        setSelectedCategoryData(foundCategory)
        setSelectedType(foundCategory.type)
        setSelectedParentId(foundCategory.parentId)
      }
    } else {
      setSelectedCategoryData(null)
      setSelectedType(null)
      setSelectedParentId(null)
    }
  }, [value, allCategories])

  // 전체 카테고리 로드 (최적화: 단일 API 호출, 경량화 모드)
  const loadAllCategories = async () => {
    try {
      setLoading(true)
      const result = await getAllCategories(organizationId, true, true)
      const categories = handleServerActionResult(result) as CategoryData[]
      setAllCategories(categories)
    } catch (error) {
      const errorMessage = handleError(error, 'loadAllCategories')
      if (errorMessage) {
        console.error('카테고리 로드 실패:', errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  // 클라이언트 사이드 필터링: 특정 타입의 카테고리 가져오기
  const getCategoriesForType = useCallback(
    (type: TransactionType): CategoryData[] => {
      return allCategories.filter(cat => cat.type === type)
    },
    [allCategories]
  )

  // 현재 선택된 타입의 카테고리들 (메모이제이션)
  const currentTypeCategories = useMemo(() => {
    return selectedType ? getCategoriesForType(selectedType) : []
  }, [selectedType, getCategoriesForType])

  // 대분류 카테고리 목록 (parentId가 null인 카테고리들)
  const parentCategories = useMemo(() => {
    return currentTypeCategories
      .filter(cat => !cat.parentId && cat.isActive)
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)
      )
  }, [currentTypeCategories])

  // 소분류 카테고리 목록 (선택된 대분류의 children)
  const childCategories = useMemo(() => {
    if (!selectedParentId) return []

    const parentCategory = currentTypeCategories.find(
      cat => cat.id === selectedParentId
    )
    return (
      parentCategory?.children
        .filter(child => child.isActive)
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)
        ) || []
    )
  }, [currentTypeCategories, selectedParentId])

  // 검색 필터링
  const filteredParentCategories = useMemo(() => {
    if (!searchQuery) return parentCategories
    return parentCategories.filter(cat =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [parentCategories, searchQuery])

  const filteredChildCategories = useMemo(() => {
    if (!searchQuery) return childCategories
    return childCategories.filter(cat =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [childCategories, searchQuery])

  // 모달 열기
  const handleOpen = () => {
    if (readOnly || isDisabled) return

    // 선택된 카테고리가 있으면 해당 단계로 이동
    if (selectedCategoryData) {
      setSelectedType(selectedCategoryData.type)
      setSelectedParentId(selectedCategoryData.parentId)
    } else {
      // 초기 상태로 리셋
      setSelectedType(null)
      setSelectedParentId(null)
    }

    setSearchQuery('')
    onOpen()
  }

  // 타입 선택
  const handleTypeSelect = (type: TransactionType) => {
    setSelectedType(type)
    setSelectedParentId(null) // 타입 변경 시 대분류 선택 초기화
  }

  // 대분류 선택
  const handleParentSelect = (parentId: string) => {
    setSelectedParentId(parentId)
  }

  // 소분류 선택 (최종 선택)
  const handleCategorySelect = (categoryId: string) => {
    const selectedCategory = currentTypeCategories
      .flatMap((cat: CategoryData) => cat.children)
      .find((child: any) => child.id === categoryId)

    if (selectedCategory) {
      const fullCategoryData = {
        id: selectedCategory.id,
        name: selectedCategory.name,
        type: selectedCategory.type,
        parentId: selectedParentId,
        displayOrder: selectedCategory.displayOrder,
        isActive: selectedCategory.isActive,
        parent: parentCategories.find(p => p.id === selectedParentId) || null,
        children: [],
        transactionCount: 0,
      }

      onSelectionChange(categoryId, fullCategoryData)
      onClose()
    }
  }

  // 대분류만 선택 (소분류가 없는 경우)
  const handleParentOnlySelect = (parentId: string) => {
    const parentCategory = currentTypeCategories.find(
      (cat: CategoryData) => cat.id === parentId
    )
    if (parentCategory) {
      onSelectionChange(parentId, parentCategory)
      onClose()
    }
  }

  // 선택 없음
  const handleNoneSelect = () => {
    onSelectionChange(undefined)
    onClose()
  }

  // Breadcrumb 단계 클릭
  const handleBreadcrumbStepClick = (
    step: 'type' | 'parent' | 'category',
    id?: string
  ) => {
    if (step === 'type') {
      setSelectedParentId(null)
    } else if (step === 'parent') {
      // 대분류 단계로 이동 (소분류 선택 초기화)
    }
  }

  // 뒤로 가기
  const handleBack = () => {
    if (selectedParentId) {
      setSelectedParentId(null)
    } else if (selectedType) {
      setSelectedType(null)
    }
  }

  // 현재 단계 제목
  const getCurrentStepTitle = () => {
    if (!selectedType) return '거래 유형 선택'
    if (!selectedParentId) return '대분류 선택'
    return '소분류 선택'
  }

  // 선택된 카테고리 표시 텍스트
  const getDisplayText = () => {
    if (!selectedCategoryData) return placeholder

    const parts = []
    parts.push(getTypeName(selectedCategoryData.type))

    if (selectedCategoryData.parent) {
      parts.push(selectedCategoryData.parent.name)
    }

    parts.push(selectedCategoryData.name)
    return parts.join(' > ')
  }

  return (
    <>
      {/* 선택 버튼 */}
      <div className="w-full">
        <Button
          variant={variant}
          size={size}
          className={`w-full justify-start h-auto min-h-[40px] p-3 ${
            isInvalid ? 'border-danger' : ''
          }`}
          onPress={handleOpen}
          isDisabled={readOnly || isDisabled}
        >
          <div className="flex flex-col items-start gap-1 w-full">
            {label && (
              <span className="text-xs text-gray-500 font-medium">
                {label}
                {isRequired && <span className="text-danger"> *</span>}
              </span>
            )}
            <div className="flex items-center justify-between w-full">
              <span
                className={
                  selectedCategoryData ? 'text-foreground' : 'text-gray-400'
                }
              >
                {getDisplayText()}
              </span>
              {selectedCategoryData && (
                <CategoryIcon type={selectedCategoryData.type} size={16} />
              )}
            </div>
          </div>
        </Button>

        {/* 에러 메시지 */}
        {isInvalid && errorMessage && (
          <p className="text-xs text-danger mt-1">{errorMessage}</p>
        )}
      </div>

      {/* 선택 모달 */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        scrollBehavior="inside"
        classNames={{
          base: 'max-h-[80vh]',
          body: 'p-0',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2">
            {/* 제목과 뒤로가기 */}
            <div className="flex items-center gap-2">
              {(selectedType || selectedParentId) && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={handleBack}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <h3 className="text-lg font-semibold">{getCurrentStepTitle()}</h3>
            </div>

            {/* Breadcrumb */}
            {(selectedType || selectedParentId) && (
              <CategoryBreadcrumb
                selectedType={selectedType || undefined}
                selectedParentCategory={
                  selectedParentId
                    ? parentCategories.find(p => p.id === selectedParentId)
                    : undefined
                }
                onStepClick={handleBreadcrumbStepClick}
              />
            )}

            {/* 검색 바 */}
            {selectedType && (
              <>
                <Divider />
                <Input
                  placeholder="카테고리 검색..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  startContent={<Search className="w-4 h-4 text-gray-400" />}
                  size="sm"
                  variant="bordered"
                />
              </>
            )}
          </ModalHeader>

          <ModalBody>
            {/* 선택 없음 옵션 */}
            {includeNoneOption && !selectedType && (
              <div className="p-4 border-b">
                <Button
                  variant="light"
                  className="w-full justify-start"
                  onPress={handleNoneSelect}
                >
                  <span className="text-gray-500">{noneOptionLabel}</span>
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : (
              <>
                {/* 1단계: 거래 유형 선택 */}
                {!selectedType && (
                  <div className="flex flex-col">
                    {transactionTypes.map(type => (
                      <div
                        key={type}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                        onClick={() => handleTypeSelect(type)}
                      >
                        <CategoryIcon type={type} size={18} />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getTypeName(type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {type === 'income' && '급여, 사업소득, 투자수익 등'}
                            {type === 'savings' && '예금, 적금, 투자, 연금 등'}
                            {type === 'fixed_expense' &&
                              '주거비, 교통비, 통신비, 보험료 등'}
                            {type === 'variable_expense' &&
                              '식비, 쇼핑, 여가, 의료비 등'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2단계: 대분류 선택 */}
                {selectedType && !selectedParentId && (
                  <div className="flex flex-col">
                    {filteredParentCategories.map(category => (
                      <div
                        key={category.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          if (category.children.length > 0) {
                            handleParentSelect(category.id)
                          } else {
                            handleParentOnlySelect(category.id)
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CategoryNameIcon
                            categoryName={category.name}
                            categoryType={category.type}
                            size={18}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{category.name}</span>
                            {category.transactionCount > 0 && (
                              <span className="text-xs text-gray-500">
                                {category.transactionCount}건의 거래
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {category.children.length > 0 ? (
                            <Chip size="sm" variant="flat" color="default">
                              {category.children.length}개
                            </Chip>
                          ) : (
                            <div onClick={e => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                onPress={() =>
                                  handleParentOnlySelect(category.id)
                                }
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredParentCategories.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        {searchQuery
                          ? '검색 결과가 없습니다'
                          : '등록된 카테고리가 없습니다'}
                      </div>
                    )}
                  </div>
                )}

                {/* 3단계: 소분류 선택 */}
                {selectedType && selectedParentId && (
                  <div className="flex flex-col">
                    {filteredChildCategories.map(category => (
                      <div
                        key={category.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <CategoryNameIcon
                          categoryName={category.name}
                          categoryType={category.type}
                          size={18}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    ))}

                    {filteredChildCategories.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        {searchQuery
                          ? '검색 결과가 없습니다'
                          : '등록된 하위 카테고리가 없습니다'}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              취소
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
